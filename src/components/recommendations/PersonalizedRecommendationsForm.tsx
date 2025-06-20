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
import { Loader2, Sparkles } from 'lucide-react';
import type { GenerateBookRecommendationsInput, GenerateBookRecommendationsOutput } from '@/ai/flows/generate-book-recommendations';
import { generateBookRecommendations } from '@/ai/flows/generate-book-recommendations'; // Ensure this path is correct
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  readingHistory: z.string().min(10, "Please provide some reading history (at least 10 characters)."),
  preferences: z.string().min(5, "Please describe your preferences (at least 5 characters)."),
});

export function PersonalizedRecommendationsForm() {
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
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
      const input: GenerateBookRecommendationsInput = {
        readingHistory: values.readingHistory,
        preferences: values.preferences,
      };
      const result: GenerateBookRecommendationsOutput = await generateBookRecommendations(input);
      setRecommendations(result.recommendations);
      toast({
        title: "Recommendations Generated!",
        description: "We found some books you might like.",
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
          <CardTitle className="font-headline text-2xl">Personalized Recommendations</CardTitle>
        </div>
        <CardDescription>
          Tell us about your reading habits, and we'll suggest books you might love!
        </CardDescription>
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
                <h3 className="text-lg font-semibold mb-2 font-headline">Here are some suggestions:</h3>
                <ul className="list-disc list-inside space-y-1 bg-secondary/30 p-4 rounded-md">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
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
