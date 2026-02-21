import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Topic {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  duration: string;
}

interface Chapter {
  name: string;
  topics: Topic[];
}

interface Subject {
  name: string;
  icon: string;
  color: string;
  completedChapters: number;
  totalChapters: number;
  chapters: Chapter[];
}

const syllabusData: Subject[] = [
  {
    name: "Mathematics",
    icon: "📐",
    color: "bg-blue-500",
    completedChapters: 8,
    totalChapters: 15,
    chapters: [
      {
        name: "Chapter 1: Real Numbers",
        topics: [
          { name: "Euclid's Division Lemma", status: "completed", duration: "2 hrs" },
          { name: "Fundamental Theorem of Arithmetic", status: "completed", duration: "2 hrs" },
          { name: "Irrational Numbers", status: "completed", duration: "1.5 hrs" },
        ],
      },
      {
        name: "Chapter 2: Polynomials",
        topics: [
          { name: "Zeros of a Polynomial", status: "completed", duration: "2 hrs" },
          { name: "Relationship between Zeros and Coefficients", status: "completed", duration: "2 hrs" },
          { name: "Division Algorithm", status: "in-progress", duration: "2 hrs" },
        ],
      },
      {
        name: "Chapter 3: Pair of Linear Equations",
        topics: [
          { name: "Graphical Method", status: "upcoming", duration: "2 hrs" },
          { name: "Substitution Method", status: "upcoming", duration: "1.5 hrs" },
          { name: "Elimination Method", status: "upcoming", duration: "1.5 hrs" },
          { name: "Cross-Multiplication Method", status: "upcoming", duration: "2 hrs" },
        ],
      },
    ],
  },
  {
    name: "Physics",
    icon: "⚡",
    color: "bg-amber-500",
    completedChapters: 5,
    totalChapters: 12,
    chapters: [
      {
        name: "Chapter 1: Light - Reflection and Refraction",
        topics: [
          { name: "Reflection of Light", status: "completed", duration: "2 hrs" },
          { name: "Spherical Mirrors", status: "completed", duration: "3 hrs" },
          { name: "Refraction of Light", status: "completed", duration: "2 hrs" },
          { name: "Lenses", status: "in-progress", duration: "3 hrs" },
        ],
      },
      {
        name: "Chapter 2: Human Eye and Colourful World",
        topics: [
          { name: "The Human Eye", status: "upcoming", duration: "2 hrs" },
          { name: "Defects of Vision", status: "upcoming", duration: "2 hrs" },
          { name: "Dispersion of Light", status: "upcoming", duration: "1.5 hrs" },
        ],
      },
    ],
  },
  {
    name: "Chemistry",
    icon: "🧪",
    color: "bg-green-500",
    completedChapters: 6,
    totalChapters: 10,
    chapters: [
      {
        name: "Chapter 1: Chemical Reactions and Equations",
        topics: [
          { name: "Chemical Equations", status: "completed", duration: "1.5 hrs" },
          { name: "Types of Chemical Reactions", status: "completed", duration: "3 hrs" },
          { name: "Oxidation and Reduction", status: "completed", duration: "2 hrs" },
        ],
      },
      {
        name: "Chapter 2: Acids, Bases and Salts",
        topics: [
          { name: "Understanding Acids and Bases", status: "completed", duration: "2 hrs" },
          { name: "pH Scale", status: "in-progress", duration: "2 hrs" },
          { name: "Salts and their Properties", status: "upcoming", duration: "2 hrs" },
        ],
      },
    ],
  },
  {
    name: "Biology",
    icon: "🧬",
    color: "bg-emerald-500",
    completedChapters: 4,
    totalChapters: 8,
    chapters: [
      {
        name: "Chapter 1: Life Processes",
        topics: [
          { name: "Nutrition", status: "completed", duration: "3 hrs" },
          { name: "Respiration", status: "completed", duration: "2 hrs" },
          { name: "Transportation", status: "in-progress", duration: "2 hrs" },
          { name: "Excretion", status: "upcoming", duration: "2 hrs" },
        ],
      },
      {
        name: "Chapter 2: Control and Coordination",
        topics: [
          { name: "Nervous System", status: "upcoming", duration: "3 hrs" },
          { name: "Hormones in Animals", status: "upcoming", duration: "2 hrs" },
          { name: "Coordination in Plants", status: "upcoming", duration: "1.5 hrs" },
        ],
      },
    ],
  },
  {
    name: "English",
    icon: "📚",
    color: "bg-purple-500",
    completedChapters: 10,
    totalChapters: 14,
    chapters: [
      {
        name: "Literature: First Flight",
        topics: [
          { name: "A Letter to God", status: "completed", duration: "2 hrs" },
          { name: "Nelson Mandela: Long Walk to Freedom", status: "completed", duration: "2.5 hrs" },
          { name: "Two Stories about Flying", status: "completed", duration: "2 hrs" },
          { name: "From the Diary of Anne Frank", status: "in-progress", duration: "2 hrs" },
        ],
      },
      {
        name: "Grammar & Writing",
        topics: [
          { name: "Tenses", status: "completed", duration: "3 hrs" },
          { name: "Reported Speech", status: "completed", duration: "2 hrs" },
          { name: "Letter Writing", status: "upcoming", duration: "2 hrs" },
        ],
      },
    ],
  },
];

const getStatusBadge = (status: Topic['status']) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    case 'in-progress':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">In Progress</Badge>;
    case 'upcoming':
      return <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>;
  }
};

const getStatusIcon = (status: Topic['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in-progress':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'upcoming':
      return <ChevronRight className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function Syllabus() {
  const totalCompleted = syllabusData.reduce((acc, s) => acc + s.completedChapters, 0);
  const totalChapters = syllabusData.reduce((acc, s) => acc + s.totalChapters, 0);
  const overallProgress = Math.round((totalCompleted / totalChapters) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Syllabus</h1>
          <p className="text-muted-foreground mt-1">Class 10th - Academic Year 2024-25</p>
        </div>

        {/* Overall Progress */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Overall Progress</h3>
                  <p className="text-sm text-muted-foreground">{totalCompleted} of {totalChapters} chapters completed</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Subject Cards */}
        <div className="grid gap-6">
          {syllabusData.map((subject) => {
            const progress = Math.round((subject.completedChapters / subject.totalChapters) * 100);
            
            return (
              <Card key={subject.name} className="shadow-card overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{subject.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {subject.completedChapters}/{subject.totalChapters} chapters • {progress}% complete
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block w-32">
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                  <div className="sm:hidden mt-2">
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="multiple" className="w-full">
                    {subject.chapters.map((chapter, chapterIdx) => {
                      const completedTopics = chapter.topics.filter(t => t.status === 'completed').length;
                      const inProgressTopics = chapter.topics.filter(t => t.status === 'in-progress').length;
                      
                      return (
                        <AccordionItem key={chapterIdx} value={`${subject.name}-${chapterIdx}`} className="border-b-0">
                          <AccordionTrigger className="hover:no-underline py-3 text-left">
                            <div className="flex items-center gap-3 flex-1 mr-4">
                              <div className={`h-2 w-2 rounded-full ${
                                completedTopics === chapter.topics.length 
                                  ? 'bg-green-500' 
                                  : inProgressTopics > 0 
                                    ? 'bg-amber-500' 
                                    : 'bg-muted-foreground/30'
                              }`} />
                              <span className="font-medium text-sm">{chapter.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto mr-2">
                                {completedTopics}/{chapter.topics.length} topics
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-5 space-y-2">
                              {chapter.topics.map((topic, topicIdx) => (
                                <div 
                                  key={topicIdx}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {getStatusIcon(topic.status)}
                                    <span className="text-sm">{topic.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground hidden sm:block">
                                      {topic.duration}
                                    </span>
                                    {getStatusBadge(topic.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
