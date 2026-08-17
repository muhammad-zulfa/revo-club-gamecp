import { getSession } from "@/lib/auth";
import { getMemberProfileGate } from "@/lib/profile";
import { ShellFrame } from "./shell-frame";
import { redirect } from "next/navigation";

export async function Sidebar({
  active,
  title,
  subtitle,
  action,
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session?.role === "MEMBER" && active !== "/profile") {
    const gate = await getMemberProfileGate(session.userId);
    if (gate.shouldCompleteProfile) {
      redirect("/profile");
    }
  }

  return (
    <ShellFrame
      active={active}
      title={title}
      subtitle={subtitle}
      action={action}
      session={session ? { name: session.name, role: session.role } : null}
    >
      {children}
    </ShellFrame>
  );
}
