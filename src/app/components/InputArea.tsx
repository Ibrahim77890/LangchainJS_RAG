import { ArrowCircleRight } from "@phosphor-icons/react";

interface InputAreaProps {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    sendMessage: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({ inputValue, setInputValue, sendMessage }) => {
    return (
        <div className="flex items-center w-4/6 py-3">
            <input
                type="text"
                className="flex-1 p-2 border border-gray-500 rounded-l-md focus:outline-none focus:border-blue-500 montserrat"
                value={inputValue}
                placeholder="Write your query here..."
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600">
                <ArrowCircleRight size={25} />
            </button>
        </div>
    );
};

export default InputArea