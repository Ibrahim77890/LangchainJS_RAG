import './styles.css'

interface QueryProps {
    content: string;
}

export const Query = ({ content }: QueryProps) => {
    return <div className="text-xl montserrat my-4 flex justify-start items-start w-full">" {content} "</div>;
};
export default Query;