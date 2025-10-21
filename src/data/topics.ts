export const topicsByLesson: Record<string, string[]> = {
  daily: [
    "Describe your morning routine.",
    "Talk about a hobby you enjoy and why.",
    "Explain how you cook your favorite dish.",
    "Tell me about a memorable trip you had.",
    "What apps do you use daily and for what?",
    "How do you stay healthy and active?",
    "Describe your ideal weekend.",
    "Talk about your neighborhood and community.",
  ],
  interview: [
    "Could you walk me through your resume?",
    "Describe a challenging project and how you handled it.",
    "Tell me about a time you solved a difficult problem.",
    "What are your strengths and weaknesses?",
    "How do you collaborate in cross-functional teams?",
    "Why are you interested in this position?",
    "Describe your design process from research to delivery.",
    "How do you handle feedback and iterate?",
  ],
}

export function randomTopicFor(lessonId: string): string {
  const list = topicsByLesson[lessonId] || topicsByLesson["daily"]
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}
