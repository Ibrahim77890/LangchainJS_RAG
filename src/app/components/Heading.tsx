import { ChatCenteredDots } from "@phosphor-icons/react";
import './styles.css'

interface HeadingProps {
    content: string;
}

export const Heading = ({ content }: HeadingProps) => {
    return (
        <div className="text-3xl font-bold my-4 w-full gap-2 flex montserrat">
            <ChatCenteredDots size={32} />
            <span className="px-2">{content}</span>
        </div>
    );
};

export default Heading