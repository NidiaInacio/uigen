import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5-20251001";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-10">
          <p className="text-stone-500 text-xs tracking-widest uppercase mb-2">Get in touch</p>
          <h2 className="text-5xl font-bold text-stone-100 tracking-tight leading-none">Let's talk.</h2>
        </div>

        {sent ? (
          <div className="border border-stone-700 p-8">
            <p className="text-stone-300 text-lg">Message received. We'll be in touch.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">Name</label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="w-full bg-transparent border-b border-stone-700 text-stone-100 py-2 focus:outline-none focus:border-stone-300 transition-colors placeholder-stone-700"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">Email</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange} required
                  className="w-full bg-transparent border-b border-stone-700 text-stone-100 py-2 focus:outline-none focus:border-stone-300 transition-colors placeholder-stone-700"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">Message</label>
              <textarea
                name="message" value={formData.message} onChange={handleChange} required rows={5}
                className="w-full bg-transparent border-b border-stone-700 text-stone-100 py-2 focus:outline-none focus:border-stone-300 transition-colors resize-none placeholder-stone-700"
                placeholder="Tell us about your project..."
              />
            </div>
            <button
              type="submit"
              className="group flex items-center gap-3 text-stone-100 text-sm tracking-widest uppercase hover:gap-5 transition-all duration-300"
            >
              <span>Send message</span>
              <span className="h-px w-8 bg-stone-100 group-hover:w-12 transition-all duration-300" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React, { useState } from 'react';

const Card = ({
  title = "Editorial Design",
  description = "Thoughtful composition and deliberate whitespace. Every element earns its place on the page.",
  tag = "Featured"
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-8">
      <div
        className="w-full max-w-sm cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative bg-amber-900 p-8 pb-12 transition-transform duration-500" style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}>
          <span className="text-amber-300 text-xs tracking-widest uppercase">{tag}</span>
          <div className="mt-16 mb-6">
            <h3 className="text-4xl font-bold text-amber-50 leading-tight tracking-tight">{title}</h3>
          </div>
          <div className="h-px bg-amber-700 mb-6" />
          <p className="text-amber-200 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="bg-amber-800 px-8 py-4 flex justify-between items-center">
          <span className="text-amber-400 text-xs tracking-widest uppercase">Read more</span>
          <span className="text-amber-400 text-lg" style={{ transform: hovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.3s' }}>→</span>
        </div>
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-center select-none">
        <p className="text-zinc-600 text-xs tracking-widest uppercase mb-8">Counter</p>

        <div className="relative mb-12">
          <span className="text-zinc-800 font-bold leading-none" style={{ fontSize: '20rem', lineHeight: 1 }}>
            {String(Math.abs(count)).padStart(2, '0')}
          </span>
          {count < 0 && (
            <span className="absolute top-8 -left-16 text-zinc-600 font-bold" style={{ fontSize: '8rem' }}>−</span>
          )}
        </div>

        <div className="flex items-center gap-12 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-12 h-12 border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-100 transition-colors duration-200 flex items-center justify-center text-xl"
          >
            −
          </button>
          <button
            onClick={() => setCount(0)}
            className="text-zinc-700 text-xs tracking-widest uppercase hover:text-zinc-400 transition-colors duration-200"
          >
            Reset
          </button>
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-12 h-12 border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-100 transition-colors duration-200 flex items-center justify-center text-xl"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return <${componentName} />;
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey || apiKey === "your-api-key-here") {
    console.log(
      "ANTHROPIC_API_KEY is not set (or is still the placeholder). " +
        "Using the mock provider — responses will be canned. " +
        "Set a real key in .env to generate components with Claude."
    );
    return new MockLanguageModel("mock-" + MODEL);
  }

  return anthropic(MODEL);
}
