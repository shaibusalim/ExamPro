import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { questionId } = await params
    const id = String(questionId)
    if (!id) return NextResponse.json({ error: "Question ID required" }, { status: 400 })

    const qRef = firestore.collection("questions").doc(id)
    const qDoc = await qRef.get()
    if (!qDoc.exists) return NextResponse.json({ error: "Question not found" }, { status: 404 })

    const optionsSnap = await qRef.collection("options").get()
    if (!optionsSnap.empty) {
      const batch = firestore.batch()
      for (const opt of optionsSnap.docs) {
        batch.delete(opt.ref)
      }
      await batch.commit()
    }

    await qRef.delete()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/Questions/Delete] Error:", e)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { questionId } = await params
    const id = String(questionId)
    if (!id) return NextResponse.json({ error: "Question ID required" }, { status: 400 })

    const body = await request.json()
    const updates: Record<string, any> = {}
    if (typeof body.questionText === "string" && body.questionText.trim()) updates.questionText = body.questionText.trim()
    if (typeof body.marks === "number" && body.marks >= 0) updates.marks = body.marks
    if (typeof body.explanation === "string") updates.explanation = body.explanation

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const qRef = firestore.collection("questions").doc(id)
    const qDoc = await qRef.get()
    if (!qDoc.exists) return NextResponse.json({ error: "Question not found" }, { status: 404 })

    await qRef.set(updates, { merge: true })
    const updatedDoc = await qRef.get()
    return NextResponse.json({ id, ...(updatedDoc.data() as any) })
  } catch (e) {
    console.error("[API/Admin/Questions/PATCH] Error:", e)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}
