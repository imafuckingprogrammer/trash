
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox"; // Using shadcn Checkbox
import { Label } from "@/components/ui/label"; // Using shadcn Label
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ListPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createList } from "@/lib/services/listService";
import { useEffect } from "react";

const listFormSchema = z.object({
  name: z.string().min(3, "List name must be at least 3 characters.").max(100, "List name must be 100 characters or less."),
  description: z.string().max(500, "Description must be 500 characters or less.").optional().default(''),
  is_public: z.boolean().default(true),
});

type ListFormValues = z.infer<typeof listFormSchema>;

export default function NewListPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, userProfile } = useAuth();

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: {
      name: "",
      description: "",
      is_public: true,
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/lists/new');
    }
  }, [authLoading, isAuthenticated, router]);

  async function onSubmit(data: ListFormValues) {
    if (!userProfile) {
        toast({ title: "Error", description: "You must be logged in to create a list.", variant: "destructive"});
        return;
    }
    form.clearErrors(); // Clear previous errors
    try {
      const newList = await createList({
        name: data.name,
        description: data.description,
        is_public: data.is_public,
        // user_id will be handled by backend using authenticated user
      });
      toast({
        title: "List Created!",
        description: `Your list "${newList.name}" has been successfully created.`,
      });
      router.push(`/lists/${newList.id}`); // Navigate to the new list's page
    } catch (error) {
      console.error("Failed to create list:", error);
      const message = error instanceof Error ? error.message : "Could not create list.";
      toast({ title: "Error Creating List", description: message, variant: "destructive" });
    }
  }
  
  if (authLoading || !isAuthenticated) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <ListPlus className="h-7 w-7 text-primary" />
            <CardTitle className="font-headline text-3xl">Create a New Book List</CardTitle>
          </div>
          <CardDescription>Organize your books into custom collections.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Reads, Sci-Fi Favorites" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of what this list is about."
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
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="is_public_checkbox"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="is_public_checkbox" className="cursor-pointer">
                        Make list public?
                      </Label>
                      <FormDescription>
                        Public lists can be seen by others. Private lists are only visible to you.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full md:w-auto transition-transform hover:scale-105" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? "Creating..." : "Create List"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
