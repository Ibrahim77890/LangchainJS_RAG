import ReactMarkdown from 'react-markdown'
import remarkGfm from "remark-gfm";
import './styles.css'
import { ChatCenteredDots } from '@phosphor-icons/react';

interface GPTProps {
    content: string;
}


const GPT = ({ content }: GPTProps) => (
    <div>
    <div className="text-3xl font-bold my-4 w-full gap-2 flex montserrat">
            <ChatCenteredDots size={32} />
            <span className="px-2">Answer</span>
        </div>
    <ReactMarkdown
        className="prose mt-1 w-full break-words text-lg prose-p:leading-relaxed montserrat"
        remarkPlugins={[remarkGfm]}
        components={{
            a: ({ node, ...props }) => <a {...props} style={{ color: "blue", fontWeight: "bold" }} />,
        }}
    >
        {content}
    </ReactMarkdown>
    </div>
);

export default GPT