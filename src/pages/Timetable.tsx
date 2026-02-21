import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";

interface Period {
  time: string;
  subject: string;
  teacher: string;
  room: string;
  type: 'lecture' | 'lab' | 'break' | 'free';
}

interface DaySchedule {
  day: string;
  periods: Period[];
}

const weeklySchedule: DaySchedule[] = [
  {
    day: "Monday",
    periods: [
      { time: "8:00 - 8:45", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "8:50 - 9:35", subject: "Physics", teacher: "Mrs. Johnson", room: "Room 102", type: "lecture" },
      { time: "9:40 - 10:25", subject: "Chemistry", teacher: "Mr. Chen", room: "Lab 1", type: "lab" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "11:35 - 12:20", subject: "Biology", teacher: "Mr. Wilson", room: "Lab 2", type: "lab" },
      { time: "12:20 - 1:00", subject: "Lunch", teacher: "", room: "", type: "break" },
      { time: "1:00 - 1:45", subject: "History", teacher: "Mrs. Brown", room: "Room 104", type: "lecture" },
    ],
  },
  {
    day: "Tuesday",
    periods: [
      { time: "8:00 - 8:45", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "8:50 - 9:35", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "9:40 - 10:25", subject: "Physics Lab", teacher: "Mrs. Johnson", room: "Lab 1", type: "lab" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "Chemistry", teacher: "Mr. Chen", room: "Room 102", type: "lecture" },
      { time: "11:35 - 12:20", subject: "Computer Science", teacher: "Mr. Patel", room: "Computer Lab", type: "lab" },
      { time: "12:20 - 1:00", subject: "Lunch", teacher: "", room: "", type: "break" },
      { time: "1:00 - 1:45", subject: "Free Period", teacher: "", room: "", type: "free" },
    ],
  },
  {
    day: "Wednesday",
    periods: [
      { time: "8:00 - 8:45", subject: "Biology", teacher: "Mr. Wilson", room: "Room 105", type: "lecture" },
      { time: "8:50 - 9:35", subject: "Chemistry", teacher: "Mr. Chen", room: "Room 102", type: "lecture" },
      { time: "9:40 - 10:25", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "Physics", teacher: "Mrs. Johnson", room: "Room 102", type: "lecture" },
      { time: "11:35 - 12:20", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "12:20 - 1:00", subject: "Lunch", teacher: "", room: "", type: "break" },
      { time: "1:00 - 1:45", subject: "Physical Education", teacher: "Mr. Kumar", room: "Sports Ground", type: "lecture" },
    ],
  },
  {
    day: "Thursday",
    periods: [
      { time: "8:00 - 8:45", subject: "Physics", teacher: "Mrs. Johnson", room: "Room 102", type: "lecture" },
      { time: "8:50 - 9:35", subject: "Biology Lab", teacher: "Mr. Wilson", room: "Lab 2", type: "lab" },
      { time: "9:40 - 10:25", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "11:35 - 12:20", subject: "Chemistry Lab", teacher: "Mr. Chen", room: "Lab 1", type: "lab" },
      { time: "12:20 - 1:00", subject: "Lunch", teacher: "", room: "", type: "break" },
      { time: "1:00 - 1:45", subject: "History", teacher: "Mrs. Brown", room: "Room 104", type: "lecture" },
    ],
  },
  {
    day: "Friday",
    periods: [
      { time: "8:00 - 8:45", subject: "Chemistry", teacher: "Mr. Chen", room: "Room 102", type: "lecture" },
      { time: "8:50 - 9:35", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "9:40 - 10:25", subject: "Physics", teacher: "Mrs. Johnson", room: "Room 102", type: "lecture" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "Biology", teacher: "Mr. Wilson", room: "Room 105", type: "lecture" },
      { time: "11:35 - 12:20", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "12:20 - 1:00", subject: "Lunch", teacher: "", room: "", type: "break" },
      { time: "1:00 - 1:45", subject: "Arts/Music", teacher: "Mrs. Sharma", room: "Room 106", type: "lecture" },
    ],
  },
  {
    day: "Saturday",
    periods: [
      { time: "8:00 - 8:45", subject: "Mathematics", teacher: "Mr. Smith", room: "Room 101", type: "lecture" },
      { time: "8:50 - 9:35", subject: "Physics", teacher: "Mrs. Johnson", room: "Room 102", type: "lecture" },
      { time: "9:40 - 10:25", subject: "Chemistry", teacher: "Mr. Chen", room: "Room 102", type: "lecture" },
      { time: "10:25 - 10:45", subject: "Break", teacher: "", room: "", type: "break" },
      { time: "10:45 - 11:30", subject: "English", teacher: "Mrs. Davis", room: "Room 103", type: "lecture" },
      { time: "11:35 - 12:20", subject: "Free Period", teacher: "", room: "", type: "free" },
    ],
  },
];

const getTypeColor = (type: Period['type']) => {
  switch (type) {
    case 'lecture':
      return 'bg-primary/10 border-primary/20 text-primary';
    case 'lab':
      return 'bg-accent/10 border-accent/20 text-accent';
    case 'break':
      return 'bg-muted border-muted-foreground/20 text-muted-foreground';
    case 'free':
      return 'bg-secondary border-secondary-foreground/20 text-secondary-foreground';
    default:
      return 'bg-muted';
  }
};

const getTypeBadge = (type: Period['type']) => {
  switch (type) {
    case 'lecture':
      return <Badge variant="default" className="text-xs">Lecture</Badge>;
    case 'lab':
      return <Badge variant="secondary" className="text-xs bg-accent text-accent-foreground">Lab</Badge>;
    case 'break':
      return <Badge variant="outline" className="text-xs">Break</Badge>;
    case 'free':
      return <Badge variant="outline" className="text-xs">Free</Badge>;
    default:
      return null;
  }
};

export default function Timetable() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Weekly Timetable</h1>
          <p className="text-muted-foreground mt-1">Class 10th - Section A</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
            <span className="text-sm text-muted-foreground">Lecture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent/20 border border-accent/40" />
            <span className="text-sm text-muted-foreground">Lab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/20" />
            <span className="text-sm text-muted-foreground">Break</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary border border-secondary-foreground/20" />
            <span className="text-sm text-muted-foreground">Free Period</span>
          </div>
        </div>

        {/* Mobile View - Cards per day */}
        <div className="md:hidden space-y-4">
          {weeklySchedule.map((daySchedule) => (
            <Card key={daySchedule.day} className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{daySchedule.day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {daySchedule.periods.map((period, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${getTypeColor(period.type)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{period.subject}</span>
                      {getTypeBadge(period.type)}
                    </div>
                    <div className="flex items-center gap-4 text-sm opacity-80">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {period.time}
                      </span>
                      {period.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {period.room}
                        </span>
                      )}
                    </div>
                    {period.teacher && (
                      <p className="text-sm opacity-70 mt-1">{period.teacher}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block">
          <Card className="shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Time</th>
                    {weeklySchedule.map((day) => (
                      <th key={day.day} className="text-left p-4 font-semibold text-muted-foreground min-w-[150px]">
                        {day.day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedule[0].periods.map((_, periodIdx) => (
                    <tr key={periodIdx} className="border-b last:border-0">
                      <td className="p-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                        {weeklySchedule[0].periods[periodIdx]?.time}
                      </td>
                      {weeklySchedule.map((day) => {
                        const period = day.periods[periodIdx];
                        if (!period) return <td key={day.day} className="p-2" />;
                        
                        return (
                          <td key={day.day} className="p-2">
                            <div className={`p-3 rounded-lg border ${getTypeColor(period.type)} h-full`}>
                              <div className="font-medium text-sm">{period.subject}</div>
                              {period.teacher && (
                                <div className="text-xs opacity-70 mt-1">{period.teacher}</div>
                              )}
                              {period.room && (
                                <div className="text-xs opacity-60 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {period.room}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
