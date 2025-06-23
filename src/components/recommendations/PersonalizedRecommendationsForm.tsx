"use client";

import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Temporary types while AI is disabled
interface BookRecommendation {
  title: string;
  author: string;
  genre: string;
  description: string;
  reasoning: string;
  matchScore: number;
}

interface GenerateBookRecommendationsOutput {
  recommendations: BookRecommendation[];
  totalRecommendations: number;
}

const formSchema = z.object({
  readingHistory: z.string().min(10, "Please provide some reading history (at least 10 characters)."),
  preferences: z.string().min(5, "Please describe your preferences (at least 5 characters)."),
});

// Mock recommendations for when AI is disabled
const getMockRecommendations = (readingHistory: string, preferences: string): GenerateBookRecommendationsOutput => {
  const mockRecommendations: BookRecommendation[] = [
    {
      title: "The Seven Husbands of Evelyn Hugo",
      author: "Taylor Jenkins Reid",
      genre: "Historical Fiction",
      description: "A reclusive Hollywood icon finally tells her story to a young journalist.",
      reasoning: "Popular contemporary fiction with strong character development",
      matchScore: 85
    },
    {
      title: "Project Hail Mary",
      author: "Andy Weir",
      genre: "Science Fiction",
      description: "A lone astronaut must save humanity with science and humor.",
      reasoning: "Engaging science fiction with problem-solving elements",
      matchScore: 90
    },
    {
      title: "The Midnight Library",
      author: "Matt Haig",
      genre: "Contemporary Fiction",
      description: "A library between life and death where you can experience different versions of your life.",
      reasoning: "Thought-provoking contemporary fiction with philosophical themes",
      matchScore: 88
    },
    {
      title: "Klara and the Sun",
      author: "Kazuo Ishiguro",
      genre: "Literary Fiction",
      description: "An artificial friend observes the world with extraordinary insight.",
      reasoning: "Literary fiction with unique perspective and beautiful prose",
      matchScore: 82
    },
    {
      title: "The Invisible Life of Addie LaRue",
      author: "V.E. Schwab",
      genre: "Fantasy",
      description: "A woman cursed to be forgotten by everyone she meets lives for centuries.",
      reasoning: "Romantic fantasy with historical elements and unique premise",
      matchScore: 87
    }
  ];

  return {
    recommendations: mockRecommendations,
    totalRecommendations: mockRecommendations.length
  };
};

export function PersonalizedRecommendationsForm() {
  const [recommendations, setRecommendations] = useState<BookRecommendation[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      readingHistory: "",
      preferences: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use mock recommendations since AI is disabled
      const result = getMockRecommendations(values.readingHistory, values.preferences);
      setRecommendations(result.recommendations);
      
      toast({
        title: "Recommendations Generated!",
        description: "Here are some popular books you might enjoy. (AI recommendations temporarily disabled)",
      });
    } catch (e) {
      console.error("Error generating recommendations:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate recommendations: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Could not generate recommendations. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl rounded-lg">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-2xl">Book Recommendations</CardTitle>
        </div>
        <CardDescription>
          Tell us about your reading habits, and we'll suggest books you might love!
        </CardDescription>
        
        {/* AI Disabled Notice */}
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>
            AI-powered recommendations are temporarily disabled. You'll receive curated popular book suggestions instead.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="readingHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Reading History</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Recently read 'Dune' by Frank Herbert (loved it!), 'Project Hail Mary' by Andy Weir (enjoyed the humor and science)."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., I enjoy science fiction with complex world-building, fantasy with strong female leads, and mysteries set in historical periods. Not a fan of romance or horror."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Get Recommendations"
              )}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {recommendations && recommendations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 font-headline">Here are some suggestions:</h3>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="bg-secondary/30 p-4 rounded-md border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-lg">"{rec.title}"</h4>
                        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                          {rec.matchScore}% match
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">by {rec.author}</p>
                      <p className="text-sm text-primary mb-2">{rec.genre}</p>
                      <p className="text-sm mb-2">{rec.description}</p>
                      <p className="text-xs text-muted-foreground italic">{rec.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recommendations && recommendations.length === 0 && (
               <Alert>
                <AlertTitle>No Recommendations Found</AlertTitle>
                <AlertDescription>We couldn't find any recommendations based on your input. Try being more specific or broader in your descriptions.</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
