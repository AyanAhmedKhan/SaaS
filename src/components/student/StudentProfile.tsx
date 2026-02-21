import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Hash, Users } from "lucide-react";

interface StudentProfileData {
  name: string;
  class: string;
  section: string;
  rollNumber: string;
  studentId: string;
  parentName: string;
  parentContact: string;
}

const profileData: StudentProfileData = {
  name: "Arjun Sharma",
  class: "10th",
  section: "A",
  rollNumber: "101",
  studentId: "STU-2025-0101",
  parentName: "Rajesh Sharma",
  parentContact: "+91 98765 43210",
};

export function StudentProfile() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Student Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {profileData.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium text-foreground">{profileData.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Class & Section</p>
              <p className="font-medium text-foreground">
                {profileData.class} - {profileData.section}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Student ID</p>
                <p className="font-medium text-foreground">{profileData.studentId}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Parent</p>
                <p className="font-medium text-foreground">{profileData.parentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Parent Contact</p>
                <p className="font-medium text-foreground">{profileData.parentContact}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Roll Number</p>
              <Badge variant="outline" className="mt-0.5">{profileData.rollNumber}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
