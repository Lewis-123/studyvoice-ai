import type { Metadata } from "next";
import StudyWorkspace from "@/components/study-workspace";

export const metadata: Metadata = {
  title: "Study Workspace | StudyVoice AI",
  description:
    "Create interactive study materials from topics, written notes, and voice recordings.",
};

export default function StudyPage() {
  return <StudyWorkspace />;
}