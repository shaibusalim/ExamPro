import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

interface Exam {
  id: string;
  title: string;
  createdBy: string;
  classId: string;
  createdAt: string; // Assuming ISO string
  // Add other exam properties as needed
}

interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  percentage: number;
  score: number;
  status: string; // e.g., "completed"
  submittedAt: string; // Assuming ISO string
  // Add other attempt properties as needed
}

interface User {
  id: string; // This would be the Firebase Auth UID, also stored in Firestore doc ID
  fullName: string;
  email: string;
  role: "teacher" | "student" | "admin";
  // Add other user properties as needed
}

interface Class {
    id: string;
    name: string;
    teacherId: string;
    // Add other class properties as needed
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = decoded.userId;

    // 1. Fetch all exams created by this teacher
    const examsRef = collection(db, "exams");
    const teacherExamsQuery = query(examsRef, where("createdBy", "==", teacherId));
    const teacherExamsSnapshot = await getDocs(teacherExamsQuery);

    const teacherExams = teacherExamsSnapshot.docs.map((doc) => {
      const { id: dataId, ...dataWithoutId } = doc.data() as Exam; // Destructure 'id' from data and ignore it
      return { id: doc.id, ...dataWithoutId };
    }) as Exam[];
    const teacherExamIds = teacherExams.map((exam) => exam.id);

    // 2. Fetch all exam attempts for these exams
    let allAttempts: any[] = [];
    if (teacherExamIds.length > 0) {
      // Firestore 'in' query limit is 10. Handle multiple queries if needed.
      const attemptsRef = collection(db, "exam_attempts");
      const attemptQueries = [];
      for (let i = 0; i < teacherExamIds.length; i += 10) {
        const batchIds = teacherExamIds.slice(i, i + 10);
        attemptQueries.push(query(attemptsRef, where("examId", "in", batchIds), where("status", "==", "completed")));
      }
      const attemptSnapshots = await Promise.all(attemptQueries.map(q => getDocs(q)));
      attemptSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const { id: dataId, ...dataWithoutId } = doc.data() as ExamAttempt; // Destructure 'id' from data and ignore it
          allAttempts.push({ id: doc.id, ...dataWithoutId });
        });
      });
    }

    // 3. Fetch all classes created by this teacher
    const classesRef = collection(db, "classes");
    const teacherClassesQuery = query(classesRef, where("teacherId", "==", teacherId));
    const teacherClassesSnapshot = await getDocs(teacherClassesQuery);
    const teacherClasses = teacherClassesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Class[]; // Cast to Class array
    const teacherClassIds = teacherClasses.map((cls) => cls.id);

    // 4. Fetch all enrollments for these classes
    let allEnrollments: any[] = [];
    let allStudentIds: string[] = [];
    if (teacherClassIds.length > 0) {
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQueries = [];
      for (let i = 0; i < teacherClassIds.length; i += 10) {
        const batchIds = teacherClassIds.slice(i, i + 10);
        enrollmentQueries.push(query(enrollmentsRef, where("classId", "in", batchIds)));
      }
      const enrollmentSnapshots = await Promise.all(enrollmentQueries.map(q => getDocs(q)));
      enrollmentSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          allEnrollments.push({ id: doc.id, ...data });
          if (!allStudentIds.includes(data.studentId)) {
            allStudentIds.push(data.studentId);
          }
        });
      });
    }

    // 5. Fetch details for all relevant students
    const studentDetailsMap = new Map();
    if (allStudentIds.length > 0) {
      const usersRef = collection(db, "users");
      const studentQueries = [];
      for (let i = 0; i < allStudentIds.length; i += 10) {
        const batchIds = allStudentIds.slice(i, i + 10);
        studentQueries.push(query(usersRef, where("id", "in", batchIds))); // 'id' field in 'users' collection
      }
      const studentSnapshots = await Promise.all(studentQueries.map(q => getDocs(q)));
      studentSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data() as User; // Cast to User
          studentDetailsMap.set(doc.id, { id: doc.id, ...data });
        });
      });
    }


    // --- Perform in-memory aggregations ---

    // Summary Statistics
    let avg_score = 0;
    let highest_score = 0;
    let lowest_score = 100; // Assuming scores are percentages 0-100
    let total_submissions = allAttempts.length;
    let passed_count = 0;

    if (total_submissions > 0) {
      const percentages = allAttempts.map((attempt) => attempt.percentage || 0);
      avg_score = percentages.reduce((sum: number, p: number) => sum + p, 0) / total_submissions;
      highest_score = Math.max(...percentages);
      lowest_score = Math.min(...percentages);
      passed_count = percentages.filter((p) => p >= 50).length;
    }

    const summary = {
      avg_score: parseFloat(avg_score.toFixed(2)),
      highest_score: highest_score,
      lowest_score: lowest_score,
      total_submissions: total_submissions,
      passed_count: passed_count,
    };

    // Per-exam breakdown
    const examBreakdownMap = new Map();
    teacherExams.forEach(exam => {
      examBreakdownMap.set(exam.id, {
        id: exam.id,
        title: exam.title,
        avg_score: 0,
        submissions: 0,
        passed: 0,
        percentages: [], // Temporary storage for percentages
      });
    });

    allAttempts.forEach(attempt => {
      const exam = examBreakdownMap.get(attempt.examId);
      if (exam) {
        exam.percentages.push(attempt.percentage || 0);
        exam.submissions += 1;
        if ((attempt.percentage || 0) >= 50) {
          exam.passed += 1;
        }
      }
    });

    const examBreakdown = Array.from(examBreakdownMap.values()).map(exam => {
      if (exam.submissions > 0) {
        exam.avg_score = exam.percentages.reduce((sum: number, p: number) => sum + p, 0) / exam.submissions;
      }
      delete exam.percentages; // Clean up temporary array
      exam.avg_score = parseFloat(exam.avg_score.toFixed(2));
      return exam;
    }).sort((a, b) => {
        // Find the original exam object to get createdAt for sorting
        const originalExamA = teacherExams.find(te => te.id === a.id);
        const originalExamB = teacherExams.find(te => te.id === b.id);
        const dateA = originalExamA ? new Date(originalExamA.createdAt).getTime() : 0;
        const dateB = originalExamB ? new Date(originalExamB.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    // Student performance
    const studentPerformanceMap = new Map();
    allStudentIds.forEach(sId => {
        const student = studentDetailsMap.get(sId);
        if (student) {
            studentPerformanceMap.set(sId, {
                id: sId,
                full_name: student.fullName,
                email: student.email,
                avg_score: 0,
                total_exams: 0,
                passed_exams: 0,
                percentages: [], // Temporary storage
                attemptedExams: new Set(), // To count unique exams
            });
        }
    });

    allAttempts.forEach(attempt => {
        const studentPerf = studentPerformanceMap.get(attempt.studentId);
        if (studentPerf) {
            studentPerf.percentages.push(attempt.percentage || 0);
            studentPerf.attemptedExams.add(attempt.examId);
            if ((attempt.percentage || 0) >= 50) {
                studentPerf.passed_exams += 1;
            }
        }
    });

    const studentPerformance = Array.from(studentPerformanceMap.values()).map(student => {
        if (student.percentages.length > 0) {
            student.avg_score = student.percentages.reduce((sum: number, p: number) => sum + p, 0) / student.percentages.length;
        }
        student.total_exams = student.attemptedExams.size;
        delete student.percentages;
        delete student.attemptedExams;
        student.avg_score = parseFloat(student.avg_score.toFixed(2));
        return student;
    }).sort((a, b) => b.avg_score - a.avg_score);

    return NextResponse.json({
      summary: summary,
      examBreakdown,
      studentPerformance,
    });
  } catch (error) {
    console.error("[Firebase] Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
