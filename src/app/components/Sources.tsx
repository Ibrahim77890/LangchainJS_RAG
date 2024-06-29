import { GitBranch } from "@phosphor-icons/react";
import './styles.css'

interface SourcesProps {
    content: { title: string; link: string }[];
}

export const Sources = ({ content }: SourcesProps) => {
    const truncateText = (text: string, maxLength: number) => (text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`);
    const extractSiteName = (url: string) => new URL(url).hostname.replace("www.", "");

    return (
        <div>
            <div className="text-3xl font-bold my-4 gap-2 montserrat w-full flex">
                <GitBranch size={32} />
                <span className="px-2">Sources</span>
            </div>
            <div className="flex flex-col">
                {content?.map(({ title, link }, index) => (
                    <a href={link} key={index} className="w-fit p-1">
                        <span className="flex flex-row gap-4 items-center py-2 px-6 bg-white rounded shadow hover:shadow-lg transition-opacity duration-300 tile-animation h-full">
                            <span>{truncateText(title, 40)}</span>
                            <span>{extractSiteName(link)}</span>
                        </span>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default Sources