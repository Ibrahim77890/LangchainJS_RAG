import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import OpenAI from "openai";
import cheerio from "cheerio";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from 'next';
import { BraveSearch } from "@langchain/community/tools/brave_search";
import { NextRequest, NextResponse } from "next/server";
import bodyParser from "body-parser"

const openai = new OpenAI();
const embeddings = new OpenAIEmbeddings();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseApiKey = process.env.SUPABASE_API_KEY!;

if (!supabaseUrl || !supabaseApiKey) {
  throw new Error('SUPABASE_URL and SUPABASE_API_KEY must be defined in the environment variables.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey);

interface Payload {
  type: string;
  content: any;
}

interface SearchResultItem {
  link: string;
}

interface GPTStreamPart {
  choices: {
    delta?: {
      content?: string;
    };
  }[];
}

async function sendPayload(content: Payload): Promise<void> {
  await supabase
    .from("message_history")
    .insert([{ payload: content }])
    .select("id").then((data)=>{console.log(data)});
}

//This method makes the provided query to a Standalone question which is typically done using OpenAI or any other chatbot by prompting it to give it some role
async function rephraseInput(inputString: string): Promise<string> {
  const gptAnswer = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a rephraser and always respond with a rephrased version of the input that is given to a search engine API. Always be succinct and use the same words as the input.",
      },
      { role: "user", content: inputString },
    ],
  });

  if (gptAnswer.choices.length > 0 && gptAnswer.choices[0].message?.content) {
    return gptAnswer.choices[0].message.content;
  } else {
    throw new Error('No response from OpenAI API');
  }
}

function normalizeData(docs: string): { title: string, link: string }[] {
  return JSON.parse(docs)
    .filter((doc: any) => doc.title && doc.link && !doc.link.includes("brave.com"))
    .slice(0, 4)
    .map(({ title, link }: { title: string, link: string }) => ({ title, link }));
}

async function fetchPageContent(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

function extractMainContent(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, head, nav, footer, iframe, img").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

async function triggerLLMAndFollowup(inputString: string) {
  await getGPTResults(inputString);
  const followUpResult = await generateFollowup(inputString);
  sendPayload({ type: "FollowUp", content: followUpResult });
  return Response.json({ message: "Processing request" });
}

//In this method we simply provided string of form `Query: ${message}, Top Results: ${JSON.stringify(topResult)}` and then again prompted the generative AI to generate appropriate responses for provided Query in terms of top results
/*
This is the json like structure of stream
"stream":
  {
    //Contains multiple generated responses for that particular input string
  "choices": [
      {
        "delta": {
        //Contains the timely-completed limited part of that choice not the complete result in itself
          "content": "The generated text part."
        }
      }
    ]
  }
*/
const getGPTResults = async (inputString: string): Promise<void> => {
  let accumulatedContent = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a answer generator, you will receive top results of similarity search, they are optional to use depending how well they help answer the query.",
      },
      { role: "user", content: inputString },
    ],
    stream: true,
  });

  let rowId = await createRowForGPTResponse();
  sendPayload({ type: "Heading", content: "Answer" });

  //This part of code is crucial as we always add a new part from stream of inputString provided to it and then updates the particular row eachtime to make a sensable answer
  for await (const part of stream as AsyncIterable<GPTStreamPart>) {
    if (part.choices[0]?.delta?.content) {
      accumulatedContent += part.choices[0].delta.content;
      rowId.id = await updateRowWithGPTResponse(rowId?.id, accumulatedContent);
    }
  }
};

//This method simply generates the response provided by GPT and then stores it in the table which are simply raw results based upon input results
const createRowForGPTResponse = async (): Promise<{ id: string | null; streamId: string }> => {
  const generateUniqueStreamId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const streamId = generateUniqueStreamId();
  const payload = { type: "GPT", content: "" };
  const { data, error } = await supabase.from("message_history").insert([{ payload }]).select("id");

  if (error) {
    console.error("Error creating row:", error);
    return { id: null, streamId };
  }

  return { id: data ? data[0].id : null, streamId };
};

//This methodm simply deletes previous row and inserts updated payload adn returns new rowId
const updateRowWithGPTResponse = async (prevRowId: string | null, content: string): Promise<string | null> => {
  const payload = { type: "GPT", content };

  const { error: deleteError } = await supabase.from("message_history").delete().eq("id", prevRowId);
  if (deleteError) {
    console.error("Error deleting row:", deleteError);
    return null;
  }

  const { data, error: insertError } = await supabase.from("message_history").insert([{ payload }]).select("id");

  if (insertError) {
    console.error("Error updating row:", insertError);
    return null;
  }

  return data ? data[0].id : null;
};

//This simply generates a follow-up questionairre so that user can have more understanding of that question for himself
const generateFollowup = async (message: string): Promise<string> => {
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a follow-up answer generator and always respond with 4 follow-up questions based on this input "${message}" in JSON format. i.e. { "follow_up": ["QUESTION_GOES_HERE", "QUESTION_GOES_HERE", "QUESTION_GOES_HERE"] }`,
      },
      {
        role: "user",
        content: `Generate 4 follow-up questions based on this input "${message}"`,
      },
    ],
    model: "gpt-4",
  });

  let content = chatCompletion.choices[0].message.content;
  if (!content) {
    return "";
  }
  return content;
};


async function searchEngineForSources(message: string): Promise<void> {
  const loader = new BraveSearch({ apiKey: process.env.BRAVE_SEARCH_API_KEY! });

  //Standalone Question
  const rephrasedMessage = await rephraseInput(message);
  
  //Provided this question to brave search api and returns search results for that particular question which is just simply extracting the most relevant results from internet since we donot get whole internet as our database
  const docs = await loader.invoke(rephrasedMessage);

  //Shorts the search results to just 4 docs
  const normalizedData = normalizeData(docs);

  //Now again stored this data to supabase
  await sendPayload({ type: "Sources", content: normalizedData });

  let vectorCount = 0;

  async function fetchAndProcess(item: SearchResultItem): Promise<any> {
    try {
      //Ensuring that content fetching should not take more than 1.5 seconds
      const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));

      //Simply fetches the html part of that particular page and Promise.race simply rejects the page which takes more than 1.5 seconds
      const fetchPromise = fetchPageContent(item.link);
      const htmlContent = await Promise.race([timer, fetchPromise]);

      if (htmlContent.length < 250) return null;

      //A simple method provided by langchain to avoid the overlapping between chinks of data of upto 200 characters
      const splitText = await new RecursiveCharacterTextSplitter({ chunkSize: 200, chunkOverlap: 0 }).splitText(htmlContent);

      //Converts the text chunks provided into embeddings and each embedding is annotated with link of that embedding, again also provided by langchain to provided us access to its memory store
      const vectorStore = await MemoryVectorStore.fromTexts(splitText, { annotationPosition: item.link }, embeddings);

      vectorCount++;

      //Again filters out most of the results having similarities
      return await vectorStore.similaritySearch(message, 1);
    } catch (error) {
      console.log(`Failed to fetch content for ${item.link}, skipping!`);
      vectorCount++;
      return null;
    }
  }

  //Here we got an array of results
  const results = await Promise.all(normalizedData.map(fetchAndProcess));

  while (vectorCount < 4) {
    vectorCount++;
  }

  const successfulResults = results.filter((result) => result !== null);
  const topResult = successfulResults.length > 4 ? successfulResults.slice(0, 4) : successfulResults;

  sendPayload({ type: "VectorCreation", content: `Finished Scanning Sources.` });

  //here we stringified all the results generated in that array for results
  triggerLLMAndFollowup(`Query: ${message}, Top Results: ${JSON.stringify(topResult)}`);

}

export async function POST(req: NextRequest) {
  try {
      const body = await req.json();
      const { message } = body as { message: string };
      await sendPayload({ type: "Query", content: message });
      await searchEngineForSources(message);

      return NextResponse.json({ message: "Success" });
  } catch (error) {
      console.error("Error processing request:", error);
      return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}


export async function OPTIONS() {
  return new NextResponse(null, {
      status: 204,
      headers: {
          'Allow': 'POST, OPTIONS',
      },
  });
}


//Firstly we send the query and stored it in database to retrieve its id