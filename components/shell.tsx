import { Sidebar } from "./sidebar";

export async function Shell({ active, title, subtitle, children, action }: { active: string; title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Sidebar active={active} title={title} subtitle={subtitle} action={action}>
      {children}
    </Sidebar>
  );
}
