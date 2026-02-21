import { useState } from "react";
import RoleSelector from "@/components/auth/RoleSelector";
import StudentLogin from "@/components/auth/StudentLogin";
import ParentLogin from "@/components/auth/ParentLogin";
import StaffLogin from "@/components/auth/StaffLogin";

type LoginView = 'select' | 'student' | 'parent' | 'staff';

export default function Login() {
  const [view, setView] = useState<LoginView>('select');

  const handleSelectRole = (role: 'student' | 'parent' | 'staff') => {
    setView(role);
  };

  const handleBack = () => {
    setView('select');
  };

  switch (view) {
    case 'student':
      return <StudentLogin onBack={handleBack} />;
    case 'parent':
      return <ParentLogin onBack={handleBack} />;
    case 'staff':
      return <StaffLogin onBack={handleBack} />;
    default:
      return <RoleSelector onSelectRole={handleSelectRole} />;
  }
}
