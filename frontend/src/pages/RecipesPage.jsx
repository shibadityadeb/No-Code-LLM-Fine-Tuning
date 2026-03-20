import React from "react";
import { BookOpenText, Cpu, MessageSquareText, WandSparkles } from "lucide-react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

const RECIPES = [
  {
    icon: WandSparkles,
    title: "Instruction Tuning",
    description: "Balanced defaults for assistant-style supervised fine-tuning.",
  },
  {
    icon: MessageSquareText,
    title: "Chat Alignment",
    description: "Optimized prompt formatting and conversational context windows.",
  },
  {
    icon: Cpu,
    title: "Low VRAM Mode",
    description: "QLoRA-friendly recipe for constrained local hardware.",
  },
];

export default function RecipesPage() {
  return (
    <div className="space-y-6 pb-8">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Preset library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Training recipes</h1>
            <p className="mt-2 text-sm text-gray-500">
              Use curated starting points to move faster from experiment setup to production runs.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
            <BookOpenText size={16} />
            3 curated presets
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {RECIPES.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <Icon size={20} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
            <Button variant="secondary" className="mt-6 w-full">
              Use recipe
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
