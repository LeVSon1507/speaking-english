"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { randomTopicFor } from "@/data/topics";

export type LessonCardProps = {
  id: string;
  title: string;
  description: string;
  image: string; // public path
  active?: boolean;
  onClick?: () => void;
};

export default function LessonCard({
  id,
  title,
  description,
  image,
  active,
  onClick,
}: LessonCardProps) {
  const router = useRouter();
  const handleClick = () => {
    if (onClick) return onClick();
    const topic = randomTopicFor(id);
    const url = `/speaking?lesson=${encodeURIComponent(
      id
    )}&topic=${encodeURIComponent(topic)}`;
    router.push(url);
  };
  return (
    <button
      onClick={handleClick}
      className={`shrink-0 w-[240px] h-[150px] rounded-2xl bg-white border border-black/10 shadow-[6px_6px_0px_#00000020] overflow-hidden text-left transition-transform duration-200 hover:scale-[1.02] hover:shadow-[8px_8px_0px_#00000030] ${
        active ? "ring-2 ring-black" : ""
      }`}
    >
      <div className="p-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-neutral-600">{description}</div>
      </div>
      <div className="relative h-[80px]">
        <Image src={image} alt={title} fill className="object-contain p-3" />
      </div>
    </button>
  );
}
