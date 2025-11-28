export interface Language {
  id: string
  name: string
  version: string
  mode: 'browser' | 'api'
  template: string
  extension: string
  judge0Id?: number // Judge0 language ID
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // Browser-native languages
  {
    id: 'html-css-js',
    name: 'HTML/CSS/JS',
    version: 'Latest',
    mode: 'browser',
    template: '',
    extension: 'html',
  },
  // API-based languages (via Judge0) - Common and working languages only
  {
    id: 'python',
    name: 'Python',
    version: '3.10.0',
    mode: 'api',
    template: 'print("Hello, World!")',
    extension: 'py',
    judge0Id: 71, // Python 3
  },
  {
    id: 'javascript',
    name: 'JavaScript (Node)',
    version: '18.15.0',
    mode: 'api',
    template: 'console.log("Hello, World!");',
    extension: 'js',
    judge0Id: 63, // Node.js
  },
  {
    id: 'java',
    name: 'Java',
    version: '15.0.2',
    mode: 'api',
    template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    extension: 'java',
    judge0Id: 62, // Java
  },
  {
    id: 'cpp',
    name: 'C++',
    version: '10.2.0',
    mode: 'api',
    template: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
    extension: 'cpp',
    judge0Id: 52, // C++
  },
  {
    id: 'c',
    name: 'C',
    version: '10.2.0',
    mode: 'api',
    template: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
    extension: 'c',
    judge0Id: 50, // C
  },
  {
    id: 'rust',
    name: 'Rust',
    version: '1.70.0',
    mode: 'api',
    template: `fn main() {
    println!("Hello, World!");
}`,
    extension: 'rs',
    judge0Id: 73, // Rust
  },
  {
    id: 'go',
    name: 'Go',
    version: '1.20.0',
    mode: 'api',
    template: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    extension: 'go',
    judge0Id: 60, // Go
  },
  {
    id: 'php',
    name: 'PHP',
    version: '8.2.3',
    mode: 'api',
    template: `<?php
echo "Hello, World!\\n";
?>`,
    extension: 'php',
    judge0Id: 68, // PHP
  },
  {
    id: 'ruby',
    name: 'Ruby',
    version: '3.2.0',
    mode: 'api',
    template: `puts "Hello, World!"`,
    extension: 'rb',
    judge0Id: 72, // Ruby
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    version: '5.0.3',
    mode: 'api',
    template: `console.log("Hello, World!");`,
    extension: 'ts',
    judge0Id: 74, // TypeScript
  },
  {
    id: 'swift',
    name: 'Swift',
    version: '5.5.2',
    mode: 'api',
    template: `print("Hello, World!")`,
    extension: 'swift',
    judge0Id: 83, // Swift
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    version: '1.8.0',
    mode: 'api',
    template: `fun main() {
    println("Hello, World!")
}`,
    extension: 'kt',
    judge0Id: 78, // Kotlin
  },
  {
    id: 'csharp',
    name: 'C#',
    version: '6.6.0',
    mode: 'api',
    template: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}`,
    extension: 'cs',
    judge0Id: 51, // C#
  },
  {
    id: 'bash',
    name: 'Bash',
    version: '5.0.0',
    mode: 'api',
    template: `#!/bin/bash
echo "Hello, World!"`,
    extension: 'sh',
    judge0Id: 46, // Bash
  },
  {
    id: 'sql',
    name: 'SQL',
    version: 'SQLite 3.27.2',
    mode: 'api',
    template: `SELECT 'Hello, World!' AS greeting;`,
    extension: 'sql',
    judge0Id: 82, // SQL
  },
]

export const getLanguageById = (id: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find((lang) => lang.id === id)
}

export const getBrowserLanguages = (): Language[] => {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.mode === 'browser')
}

export const getApiLanguages = (): Language[] => {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.mode === 'api')
}
