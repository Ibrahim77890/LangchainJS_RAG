"use client"
"use strict"

import React, { useEffect, useRef, useState, memo, MutableRefObject } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import MessageHandler, { MessagePayload } from "./components/MessageHandler";
import InputArea from "./components/InputArea";
import './components/styles.css'
import { PhosphorLogo } from "@phosphor-icons/react";

const SUPABASE_URL="https://msrtvvrxipekveyghgwu.supabase.co"
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcnR2dnJ4aXBla3ZleWdoZ3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk1NTQyNDcsImV4cCI6MjAzNTEzMDI0N30.iSYldNBVqsOQB9EQEvpylwHKoyHdiboXsKnI5jLxojI"
const supabase:SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


export default function Home() {
    //For scrolling down the page with respect to messages
    const messagesEndRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
    const [inputValue, setInputValue] = useState("");
    const [messageHistory, setMessageHistory] = useState<MessagePayload[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    //For auto-scrolling upto the last message
    useEffect(() => {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);
      }, [messageHistory]);

    //For extracting messages history from supabase
    useEffect(() => {
        const handleInserts = (payload: { new: MessagePayload }) => {
          setMessageHistory((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            const isSameType =
              lastMessage?.payload.type === "GPT" && payload.new.payload.type === "GPT";
            return isSameType
              ? [...prevMessages.slice(0, -1), payload.new]
              : [...prevMessages, payload.new];
          });
        };
    
        // Subscribe to real-time updates
        const subscription = supabase
          .channel("message_history")
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "message_history",
          }, handleInserts)
          .subscribe();
    
        // Fetch existing messages
        supabase
          .from("message_history")
          .select("*")
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              console.log("Error fetching data:", error);
            } else {
              setMessageHistory(data || []);
              setLoading(false);
            }
          })
    
        return () => {
          subscription.unsubscribe();
        };
      }, []);
    
      if (loading) {
        return <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <PhosphorLogo size={80} />
      </div>
      }
    //Now defining a function to send the message to the backend
    const sendMessage = async (messageToSend?: MessagePayload) => {
        const message = messageToSend || inputValue;
        const body = JSON.stringify({ message });
        setInputValue("");
        console.log("Message:",message)
        console.log("Body:",body)
    
        try {
            const response = await fetch("/api/backend", {
                method: 'POST',
                body,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("data", data);
        } catch (err) {
            console.log("err", err);
        }
    };
    

    return(
        <div className="home">
            <div className="flex justify-center h-fit py-4 w-full ">
                <p className="montserrat text-3xl">Perplexity Styled RAG AI chatbot</p>
            </div>
            <div className="w-full hide-scrollbar h-full overflow-auto">
            <div className="home-grow">
                {messageHistory?.map((message, index)=>{
                    return (<>
                    <MessageHandler key={index} message={message} sendMessage={sendMessage}/>
                    </>)
                })}
                <div ref={messagesEndRef} />
            </div>
            </div>
            <div className="flex justify-center">
                <InputArea inputValue={inputValue} setInputValue={setInputValue} sendMessage={sendMessage} />
            </div>
        </div>
    );

}

