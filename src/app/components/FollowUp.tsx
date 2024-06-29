import { Stack } from "@phosphor-icons/react";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import './styles.css'

interface FollowUpProps {
    content: string;
    sendMessage: (messageToSend?: string) => void;
}

export const FollowUp = ({ content, sendMessage }: FollowUpProps) => {
    const [followUp, setFollowUp] = useState<string[]>([]);
    const messagesEndReff: MutableRefObject<HTMLDivElement | null> = useRef(null);

    // 34. Scroll into view when followUp changes
    useEffect(() => {
        setTimeout(() => {
            messagesEndReff.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);
    }, [followUp]);

    // 35. Parse JSON content to extract follow-up options
    useEffect(() => {
        if (content[0] === "{" && content[content.length - 1] === "}") {
            try {
                const parsed = JSON.parse(content);
                setFollowUp(parsed.follow_up || []);
            } catch (error) {
                console.log("error parsing json", error);
            }
        }
    }, [content]);

    // 36. Handle follow-up click event
    const handleFollowUpClick = (text: string, e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        sendMessage(text);
    };

    // 37. Render the FollowUp component
    return (
        <div className="gap-2">
            {followUp.length > 0 && (
                <div className="text-3xl font-bold my-4 montserrat w-full flex">
                    <Stack size={32} /> <span className="px-2">Follow-Up</span>
                </div>
            )}
            <div className="gap-4 w-full flex flex-col text-blue-800">
                {followUp.map((text, index) => (
                <a href="#" key={index} className="text-md w-full p-1 montserrat" onClick={(e) => handleFollowUpClick(text, e)}>
                    <span>{text}</span>
                </a>
            ))}
            </div>
            {/* Scroll anchor */}
            <div ref={messagesEndReff} />
        </div>
    );
};
export default FollowUp