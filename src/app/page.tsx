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
      <header className="mx-4 mt-4 px-4 py-4 flex items-center justify-between rounded-2xl border border-black/10 bg-white shadow-[6px_6px_0px_#00000020] animate-[fadeIn_0.25s_ease-out]">
        <div>
          <div className="text-sm">Hello 👋</div>
          <div className="text-lg font-semibold">
            Let&apos;s learn English with AI assistant!
          </div>
        </div>
        <Image
          src="/undraw/undraw_calling_d6vk.svg"
          alt="Logo"
          width={65}
          height={65}
          className="animate-[float_8s_ease-in-out_infinite]"
        />
      </header>

      {/* Speaking section */}
      <section className="px-4 mt-4 animate-[fadeIn_0.3s_ease-out]">
        <h2 className="font-bold mb-2">Speaking</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {lessons.map((l) => (
            <div key={l.id} className="snap-start">
              <LessonCard
                id={l.id}
                title={l.title}
                description={l.description}
                image={l.image}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Chatting */}
      <section className="px-4 mt-4 animate-[fadeIn_0.35s_ease-out]">
        <h2 className="font-bold mb-2">Chatting</h2>
        <div className="rounded-2xl bg-[#D8F3FF] border border-black/10 shadow-[6px_6px_0px_#00000020] p-4 transition-transform duration-200 hover:scale-[1.01] hover:shadow-[8px_8px_0px_#00000025]">
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
            className="mt-3 inline-block rounded-xl bg-white border border-black/10 px-3 py-2 shadow-[4px_4px_0px_#00000020] text-sm transition-transform duration-200 hover:scale-[1.02] active:translate-y-[1px]"
          >
            Start
          </Link>
        </div>
      </section>

      {/* Bottom nav (placeholder) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-top border-black/10">
        <div className="container px-4 py-2 grid grid-cols-4 text-center text-xs">
          <div className="font-semibold px-2 py-1 rounded-full bg-neutral-100 border border-black/10">
            Home
          </div>
          <div className="text-neutral-500 hover:text-black transition-colors">
            History
          </div>
          <div className="text-neutral-500 hover:text-black transition-colors">
            Saved
          </div>
          <div className="text-neutral-500 hover:text-black transition-colors">
            Account
          </div>
        </div>
      </nav>
    </div>
  );
}
