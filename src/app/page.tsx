import Image from "next/image";
import LessonCard from "@/components/LessonCard";
import Link from "next/link";

const lessons = [
  {
    id: "daily",
    title: "Daily Life",
    description: "Enhance talking as a native in everyday conversations",
    image: "/undraw/undraw_people_ka7y.svg",
  },
  {
    id: "interview",
    title: "Job Interview",
    description: "Boost confidence and fluency in English interviews",
    image: "/undraw/undraw_conference-speaker_balr.svg",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Greeting */}
      <header className="container px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-sm">Hello 👋</div>
          <div className="text-lg font-semibold">
            Let&apos;s learn English with AI assistant!
          </div>
        </div>
        <Image src="/next.svg" alt="Logo" width={36} height={36} />
      </header>

      {/* Speaking section */}
      <section className="container px-4">
        <h2 className="font-bold mb-2">Speaking</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {lessons.map((l) => (
            <Link key={l.id} href="/speaking" className="block">
              <LessonCard
                id={l.id}
                title={l.title}
                description={l.description}
                image={l.image}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Chatting */}
      <section className="container px-4 mt-4">
        <h2 className="font-bold mb-2">Chatting</h2>
        <div className="rounded-2xl bg-[#D8F3FF] border border-black/10 shadow-[6px_6px_0px_#00000020] p-4">
          <div className="flex items-center gap-2">
            <Image
              src="/undraw/undraw_quick-chat_3gj8.svg"
              alt="Chat"
              width={48}
              height={48}
            />
            <div className="text-sm">Hi AI friend!</div>
          </div>
          <p className="text-xs mt-2">
            Send a &quot;Hi&quot; message to start your chat journey with our AI
            assistant
          </p>
          <Link
            href="/speaking"
            className="mt-3 inline-block rounded-xl bg-white border border-black/10 px-3 py-2 shadow-[4px_4px_0px_#00000020] text-sm"
          >
            Start
          </Link>
        </div>
      </section>

      {/* Bottom nav (placeholder) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10">
        <div className="container px-4 py-2 grid grid-cols-4 text-center text-xs">
          <div className="font-semibold">Home</div>
          <div className="text-neutral-500">History</div>
          <div className="text-neutral-500">Saved</div>
          <div className="text-neutral-500">Account</div>
        </div>
      </nav>
    </div>
  );
}
