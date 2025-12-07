import { type NextRequest, NextResponse } from "next/server"
import { generateQuestionsWithAI } from "@/lib/ai-service"

function seededShuffle<T>(arr: T[], seed: number) {
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    const j = Math.floor(r * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

const FALLBACK_TOPICS = [
  { title: "Components of Computers and Computer Systems", classLevel: "B7" },
  { title: "Technology in the community", classLevel: "B7" },
  { title: "Health and Safety in using ICT tools", classLevel: "B7" },
  { title: "Introduction to Word Processing", classLevel: "B7" },
  { title: "Introduction To Computing Generation Of Computers", classLevel: "B8" },
  { title: "Storage Systems", classLevel: "B8" },
  { title: "Health and Safety in using ICT tools", classLevel: "B8" },
  { title: "Introduction To Computing Input & Output Devices", classLevel: "B8" },
  { title: "File Management Techniques", classLevel: "B8" },
  { title: "Productivity Software", classLevel: "B8" },
  { title: "Creating Tables & Hyperlinks", classLevel: "B8" },
  { title: "Introduction to Presentation", classLevel: "B8" },
  { title: "Communication Networks Computer Networks", classLevel: "B8" },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId: string = body.userId || ''
    const classLevel: string = body.classLevel || 'B7'
    const now = Date.now()
    const seed = Array.from(userId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + now

    const topics = FALLBACK_TOPICS.filter(t => t.classLevel === classLevel).map(t => t.title)
    const shuffledTopics = seededShuffle(topics, seed)

    const quotas = {
      objective: { count: 30, marks: 1 },
      theory: { count: 10, marks: 4 },
    }

    async function genType(type: "objective" | "theory") {
      const q = quotas[type]
      const perTopic = Math.max(1, Math.floor(q.count / shuffledTopics.length))
      const tasks: Promise<any[]>[] = []
      shuffledTopics.forEach((tt) => {
        tasks.push(generateQuestionsWithAI({ type, topic: `${tt} (variant ${userId.slice(0,4)}-${now})`, difficulty: "medium", count: perTopic }))
      })
      const res = (await Promise.all(tasks)).flat()
      const extra = q.count - res.length
      if (extra > 0 && shuffledTopics[0]) {
        const more = await generateQuestionsWithAI({ type, topic: `${shuffledTopics[0]} (variant ${userId.slice(0,4)}-${now})`, difficulty: "medium", count: extra })
        res.push(...more)
      }
      return res.slice(0, q.count).map((qq: any) => ({ ...qq, marks: q.marks }))
    }

    const [objs, thys] = await Promise.all([
      genType('objective'),
      genType('theory'),
    ])

    function normKey(q: any) {
      const t = (q.type || '').toLowerCase()
      const s = String(q.question || '').toLowerCase().replace(/\s+/g, ' ').trim()
      return `${t}:${s}`
    }
    function uniqueByStem(items: any[]) {
      const seen = new Set<string>()
      const out: any[] = []
      for (const q of items) {
        const k = normKey(q)
        if (k && !seen.has(k)) {
          seen.add(k)
          out.push(q)
        }
      }
      return out
    }

    let questions = uniqueByStem([...objs, ...thys])
    const targetCounts = { objective: quotas.objective.count, theory: quotas.theory.count }
    let attempts = 0
    while (attempts < 3 && (questions.filter(q => q.type === 'objective').length < targetCounts.objective || questions.filter(q => q.type === 'theory').length < targetCounts.theory)) {
      attempts++
      const missingObj = targetCounts.objective - questions.filter(q => q.type === 'objective').length
      const missingThy = targetCounts.theory - questions.filter(q => q.type === 'theory').length
      const topic = shuffledTopics[attempts % shuffledTopics.length] || shuffledTopics[0]
      const [moreObj, moreThy] = await Promise.all([
        missingObj > 0 ? generateQuestionsWithAI({ type: 'objective', topic: `${topic} (extra ${attempts})`, difficulty: 'medium', count: missingObj }) : Promise.resolve([]),
        missingThy > 0 ? generateQuestionsWithAI({ type: 'theory', topic: `${topic} (extra ${attempts})`, difficulty: 'medium', count: missingThy }) : Promise.resolve([]),
      ])
      questions = uniqueByStem([...questions, ...moreObj, ...moreThy]).map((qq: any) => ({ ...qq, marks: qq.marks || (qq.type === 'objective' ? quotas.objective.marks : quotas.theory.marks) }))
    }
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0)
    return NextResponse.json({ questions, totalMarks })
  } catch (e) {
    console.error('[API/PracticeSession] Error:', e)
    return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
  }
}
