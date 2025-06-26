"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Code, Play, Copy, Check, Plus, Trash2, Moon, Sun, X, Edit3, FolderPlus, GripVertical } from "lucide-react"

interface TestCase {
  id: string
  input: string
  expectedOutput?: string
  actualOutput?: string
  status?: "pending" | "running" | "passed" | "failed"
}

interface CodeFile {
  id: string
  name: string
  language: "cpp" | "python" | "javascript"
  code: string
  testCases: TestCase[]
  isRunning: boolean
  isActive: boolean
}

const codeTemplates = {
  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Read input
    string name;
    cout << "Enter your name: ";
    getline(cin, name);
    cout << "Hello, " << name << "!" << endl;
    
    return 0;
}`,
  python: `def main():
    print("Hello, World!")
    
    # Read input
    name = input("Enter your name: ")
    print(f"Hello, {name}!")
    
    # Example with multiple test cases
    numbers = list(map(int, input("Enter numbers: ").split()))
    print(f"Sum: {sum(numbers)}")

if __name__ == "__main__":
    main()`,
  javascript: `function main() {
    console.log("Hello, World!");
    
    // For browser environment
    const name = prompt("Enter your name:");
    console.log(\`Hello, \${name}!\`);
    
    return 0;
}

main();`,
}

const languageColors = {
  cpp: "from-blue-400 to-cyan-400",
  python: "from-yellow-400 to-green-400",
  javascript: "from-yellow-400 to-orange-400",
}

const languageExtensions = {
  cpp: ".cpp",
  python: ".py",
  javascript: ".js",
}

const syntaxSuggestions = {
  cpp: [
    "iostream",
    "vector",
    "string",
    "algorithm",
    "map",
    "set",
    "queue",
    "stack",
    "cout",
    "cin",
    "endl",
    "namespace",
    "using",
    "std",
    "int",
    "char",
    "bool",
    "for",
    "while",
    "if",
    "else",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "class",
    "public",
    "private",
    "protected",
    "virtual",
    "const",
    "static",
  ],
  python: [
    "def",
    "class",
    "import",
    "from",
    "as",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "try",
    "except",
    "finally",
    "with",
    "lambda",
    "yield",
    "return",
    "pass",
    "print",
    "input",
    "len",
    "range",
    "enumerate",
    "zip",
    "map",
    "filter",
    "list",
    "dict",
    "set",
    "tuple",
    "str",
    "int",
    "float",
    "bool",
  ],
  javascript: [
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "try",
    "catch",
    "finally",
    "console",
    "log",
    "error",
    "warn",
    "document",
    "window",
    "addEventListener",
    "querySelector",
    "getElementById",
    "createElement",
    "appendChild",
  ],
}

export default function ResizableIDE() {
  const [files, setFiles] = useState<CodeFile[]>([
    {
      id: "1",
      name: "main.cpp",
      language: "cpp",
      code: codeTemplates.cpp,
      testCases: [{ id: "1", input: "Alice", expectedOutput: "Hello, World!\nEnter your name: Hello, Alice!" }],
      isRunning: false,
      isActive: true,
    },
  ])

  const [isDarkMode, setIsDarkMode] = useState(true)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [editingFileName, setEditingFileName] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [leftPanelWidth, setLeftPanelWidth] = useState(70) // Percentage
  const [isResizing, setIsResizing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const fileNameInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  
  const activeFile = files.find((f) => f.isActive)
  
  console.log('cursorPosition',cursorPosition)
  
  const createNewFile = useCallback(() => {
    const fileCount = files.length + 1
    const newFile: CodeFile = {
      id: Date.now().toString(),
      name: `untitled${fileCount}.cpp`,
      language: "cpp",
      code: codeTemplates.cpp,
      testCases: [{ id: "1", input: "", expectedOutput: "" }],
      isRunning: false,
      isActive: false,
    }

    setFiles((prev) => prev.map((f) => ({ ...f, isActive: false })).concat({ ...newFile, isActive: true }))
  }, [files.length])

  const deleteFile = useCallback(
    (fileId: string) => {
      if (files.length > 1) {
        setFiles((prev) => {
          const filtered = prev.filter((f) => f.id !== fileId)
          const deletedFileWasActive = prev.find((f) => f.id === fileId)?.isActive

          if (deletedFileWasActive && filtered.length > 0) {
            filtered[0].isActive = true
          }

          return filtered
        })
      }
    },
    [files.length],
  )

  const setActiveFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.map((f) => ({ ...f, isActive: f.id === fileId })))
  }, [])

  const updateFile = useCallback((fileId: string, updates: Partial<CodeFile>) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, ...updates } : file)))
  }, [])

  const updateFileName = useCallback(
    (fileId: string, newName: string) => {
      const extension = newName.includes(".") ? "" : languageExtensions.cpp
      const fullName = newName + extension
      updateFile(fileId, { name: fullName })
      setEditingFileName(null)
    },
    [updateFile],
  )

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  const addTestCase = useCallback((fileId: string) => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: "",
      expectedOutput: "",
    }

    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, testCases: [...file.testCases, newTestCase] } : file)),
    )
  }, [])

  const updateTestCase = useCallback((fileId: string, testCaseId: string, updates: Partial<TestCase>) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? {
              ...file,
              testCases: file.testCases.map((tc) => (tc.id === testCaseId ? { ...tc, ...updates } : tc)),
            }
          : file,
      ),
    )
  }, [])

  const deleteTestCase = useCallback((fileId: string, testCaseId: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? {
              ...file,
              testCases: file.testCases.filter((tc) => tc.id !== testCaseId),
            }
          : file,
      ),
    )
  }, [])

  const runCode = useCallback(
    async (fileId: string) => {
      const file = files.find((f) => f.id === fileId)
      if (!file) return

      updateFile(fileId, { isRunning: true })

      const runningTestCases = file.testCases.map((tc) => ({ ...tc, status: "running" as const }))
      updateFile(fileId, { testCases: runningTestCases })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      const simulateExecution = (code: string, input: string, language: string): string => {
        try {
          if (language === "python") {
            if (code.includes('print("Hello, World!")')) {
              let output = "Hello, World!\n"
              if (input.trim()) {
                output += `Hello, ${input.trim()}!\n`
              }
              return output.trim()
            }
          } else if (language === "cpp") {
            if (code.includes('cout << "Hello, World!"')) {
              let output = "Hello, World!\n"
              if (input.trim()) {
                output += `Enter your name: Hello, ${input.trim()}!`
              }
              return output.trim()
            }
          } else if (language === "javascript") {
            if (code.includes('console.log("Hello, World!")')) {
              let output = "Hello, World!\n"
              if (input.trim()) {
                output += `Hello, ${input.trim()}!`
              }
              return output.trim()
            }
          }
          return "Program executed successfully"
        } catch (error) {
          return `Error: ${error}`
        }
      }

      const updatedTestCases = file.testCases.map((testCase) => {
        const actualOutput = simulateExecution(file.code, testCase.input, file.language)
        const status = testCase.expectedOutput
          ? actualOutput.trim() === testCase.expectedOutput.trim()
            ? "passed"
            : "failed"
          : "passed"

        return {
          ...testCase,
          actualOutput,
          status: status as TestCase["status"],
        }
      })

      updateFile(fileId, {
        isRunning: false,
        testCases: updatedTestCases,
      })
    },
    [files, updateFile],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!activeFile) return

      const textarea = e.currentTarget
      const { selectionStart, selectionEnd, value } = textarea

      if (e.ctrlKey && e.key === "/") {
        e.preventDefault()
        const lines = value.split("\n")
        const startLine = value.substring(0, selectionStart).split("\n").length - 1
        const endLine = value.substring(0, selectionEnd).split("\n").length - 1

        const commentChar = activeFile.language === "python" ? "#" : "//"
        let newValue = ""
        let offset = 0

        for (let i = 0; i < lines.length; i++) {
          if (i >= startLine && i <= endLine) {
            if (lines[i].trim().startsWith(commentChar)) {
              lines[i] = lines[i].replace(new RegExp(`^(\\s*)${commentChar.replace("/", "\\/")}\\s?`), "$1")
              offset -= commentChar.length + 1
            } else {
              const leadingSpaces = lines[i].match(/^\s*/)?.[0] || ""
              lines[i] = leadingSpaces + commentChar + " " + lines[i].substring(leadingSpaces.length)
              offset += commentChar.length + 1
            }
          }
        }

        newValue = lines.join("\n")
        updateFile(activeFile.id, { code: newValue })

        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + offset, selectionEnd + offset)
        }, 0)
        return
      }

      if (e.key === "Tab") {
        e.preventDefault()
        const indent = "  " // 2 spaces
        const newValue = value.substring(0, selectionStart) + indent + value.substring(selectionEnd)
        updateFile(activeFile.id, { code: newValue })

        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + indent.length, selectionStart + indent.length)
        }, 0)
        return
      }

      if (e.key === "Enter") {
        const currentLine = value.substring(0, selectionStart).split("\n").pop() || ""
        const indent = currentLine.match(/^\s*/)?.[0] || ""
        const shouldAddIndent = /[{:(]\s*$/.test(currentLine.trim())

        const newIndent = shouldAddIndent ? indent + "  " : indent
        const newValue = value.substring(0, selectionStart) + "\n" + newIndent + value.substring(selectionEnd)

        updateFile(activeFile.id, { code: newValue })

        setTimeout(() => {
          const newPos = selectionStart + 1 + newIndent.length
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
        e.preventDefault()
        return
      }

      if (showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        } else if (e.key === "ArrowUp") {
          e.preventDefault()
          setSuggestionIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault()
          insertSuggestion(suggestions[suggestionIndex])
        } else if (e.key === "Escape") {
          setShowSuggestions(false)
        }
      }
    },
    [activeFile, suggestions, showSuggestions, suggestionIndex, updateFile],
  )

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!activeFile) return

      const newCode = e.target.value
      const cursorPos = e.target.selectionStart

      updateFile(activeFile.id, { code: newCode })
      setCursorPosition(cursorPos)

      const beforeCursor = newCode.substring(0, cursorPos)
      const currentWord = beforeCursor.split(/\s/).pop() || ""

      if (currentWord.length >= 2) {
        const matchingSuggestions = syntaxSuggestions[activeFile.language]
          .filter(
            (suggestion) =>
              suggestion.toLowerCase().startsWith(currentWord.toLowerCase()) &&
              suggestion.toLowerCase() !== currentWord.toLowerCase(),
          )
          .slice(0, 8)

        if (matchingSuggestions.length > 0) {
          setSuggestions(matchingSuggestions)
          setShowSuggestions(true)
          setSuggestionIndex(0)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
      }
    },
    [activeFile, updateFile],
  )

  const insertSuggestion = useCallback(
    (suggestion: string) => {
      if (!editorRef.current || !activeFile) return

      const textarea = editorRef.current
      const { selectionStart, value } = textarea

      const beforeCursor = value.substring(0, selectionStart)
      const currentWord = beforeCursor.split(/\s/).pop() || ""
      const wordStart = selectionStart - currentWord.length

      const newValue = value.substring(0, wordStart) + suggestion + value.substring(selectionStart)
      updateFile(activeFile.id, { code: newValue })

      setShowSuggestions(false)

      setTimeout(() => {
        const newPos = wordStart + suggestion.length
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
      }, 0)
    },
    [activeFile, updateFile],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (editingFileName && fileNameInputRef.current) {
      fileNameInputRef.current.focus()
      fileNameInputRef.current.select()
    }
  }, [editingFileName])

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"
          : "bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100"
      }`}
    >
      <div
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors ${
          isDarkMode ? "bg-gray-900/80 border-gray-700/50" : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className={`text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}
                >
                  Resizable IDE Pro
                </h1>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Drag to resize panels • File-based Development Environment
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={createNewFile}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-2 rounded-lg text-white transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New File</span>
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`border-b ${isDarkMode ? "border-gray-700/50 bg-gray-800/30" : "border-gray-200 bg-gray-50"}`}>
        <div className="px-6 py-2">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-all cursor-pointer group ${
                  file.isActive
                    ? isDarkMode
                      ? "bg-gray-900 border-b-2 border-purple-400 text-white"
                      : "bg-white border-b-2 border-purple-500 text-gray-900"
                    : isDarkMode
                      ? "bg-gray-700/30 text-gray-300 hover:bg-gray-600/30"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                onClick={() => setActiveFile(file.id)}
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${languageColors[file.language]}`}></div>

                {editingFileName === file.id ? (
                  <input
                    ref={fileNameInputRef}
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onBlur={() => {
                      if (newFileName.trim()) {
                        updateFileName(file.id, newFileName.trim())
                      } else {
                        setEditingFileName(null)
                      }
                      setNewFileName("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (newFileName.trim()) {
                          updateFileName(file.id, newFileName.trim())
                        } else {
                          setEditingFileName(null)
                        }
                        setNewFileName("")
                      } else if (e.key === "Escape") {
                        setEditingFileName(null)
                        setNewFileName("")
                      }
                    }}
                    className="bg-transparent border-none outline-none text-sm font-medium min-w-0 w-24"
                    style={{ width: `${Math.max(newFileName.length * 8, 80)}px` }}
                  />
                ) : (
                  <span
                    className="text-sm font-medium truncate max-w-32"
                    onDoubleClick={() => {
                      setEditingFileName(file.id)
                      setNewFileName(file.name.replace(/\.[^/.]+$/, ""))
                    }}
                  >
                    {file.name}
                  </span>
                )}

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingFileName(file.id)
                      setNewFileName(file.name.replace(/\.[^/.]+$/, ""))
                    }}
                    className="p-1 hover:bg-gray-500/20 rounded"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(file.id)
                      }}
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex h-[calc(100vh-140px)] relative">
        <div className="flex flex-col transition-all duration-150 ease-out" style={{ width: `${leftPanelWidth}%` }}>
          <div className={`p-4 border-b ${isDarkMode ? "border-gray-700/50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {activeFile && (
                  <select
                    value={activeFile.language}
                    onChange={(e) => {
                      const newLang = e.target.value as CodeFile["language"]
                      const newExt = languageExtensions[newLang]
                      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "")
                      updateFile(activeFile.id, {
                        language: newLang,
                        code: codeTemplates[newLang],
                        name: nameWithoutExt + newExt,
                      })
                    }}
                    className={`px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-purple-400 ${
                      isDarkMode
                        ? "bg-gray-700/50 text-white border-gray-600/30"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                  >
                    <option value="cpp">C++</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                )}
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    isDarkMode ? "bg-gray-700/30 text-gray-400" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {Math.round(leftPanelWidth)}% width
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => activeFile && copyToClipboard(activeFile.code, `code-${activeFile.id}`)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? "hover:bg-gray-600/30" : "hover:bg-gray-200"
                  }`}
                  title="Copy Code"
                >
                  {activeFile && copiedStates[`code-${activeFile.id}`] ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => activeFile && runCode(activeFile.id)}
                  disabled={!activeFile || activeFile.isRunning}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 text-white"
                >
                  <Play className="w-4 h-4" />
                  <span>{activeFile && activeFile.isRunning ? "Running..." : "Run"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 relative">
            <div className="relative">
              <textarea
                ref={editorRef}
                value={activeFile?.code ?? ""}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-4 rounded-lg border focus:outline-none focus:border-purple-400 font-mono text-sm resize-none bg-gray-900 text-gray-100 border-gray-600/30"
                placeholder={`Enter your ${activeFile?.language} code here...
      
Shortcuts:
• Ctrl+/ : Toggle comment
• Tab : Indent
• Type to get suggestions`}
                spellCheck={false}
                style={{ minHeight: "calc(100vh - 300px)" }}
              />

              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute z-10 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  style={{
                    top: "60px",
                    left: "20px",
                    minWidth: "200px",
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`px-3 py-2 cursor-pointer text-sm font-mono transition-colors ${
                        index === suggestionIndex ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                      onClick={() => insertSuggestion(suggestion)}
                    >
                      <span className="text-purple-400">{activeFile?.language ?? ''}</span>
                      <span className="ml-2">{suggestion}</span>
                    </div>
                  ))}
                  <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-600">
                    ↑↓ Navigate • Enter/Tab Select • Esc Close
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`w-1 cursor-col-resize group relative flex items-center justify-center transition-colors ${
            isDarkMode ? "bg-gray-700/50 hover:bg-purple-500/50" : "bg-gray-300 hover:bg-purple-400/50"
          } ${isResizing ? (isDarkMode ? "bg-purple-500" : "bg-purple-400") : ""}`}
          onMouseDown={handleMouseDown}
        >
          <div
            className={`absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
              isResizing ? "opacity-100" : ""
            }`}
          >
            <GripVertical className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
          </div>
        </div>

        <div
          className={`flex flex-col transition-all duration-150 ease-out ${
            isDarkMode ? "bg-gray-800/20" : "bg-gray-50/50"
          }`}
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className={`p-4 border-b ${isDarkMode ? "border-gray-700/50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">Test Cases</h3>
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    isDarkMode ? "bg-gray-700/30 text-gray-400" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {Math.round(100 - leftPanelWidth)}% width
                </div>
              </div>
              <button
                onClick={() => addTestCase(activeFile?.id ?? '')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-3 py-1.5 rounded-lg text-sm transition-all flex items-center space-x-1 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeFile?.testCases.map((testCase, index) => (
              <div
                key={testCase.id}
                className={`rounded-lg p-4 border ${
                  isDarkMode ? "bg-gray-800/30 border-gray-600/20" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Test {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    {testCase.status && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          testCase.status === "passed"
                            ? "bg-green-500/20 text-green-400"
                            : testCase.status === "failed"
                              ? "bg-red-500/20 text-red-400"
                              : testCase.status === "running"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {testCase.status}
                      </span>
                    )}
                    {activeFile.testCases.length > 1 && (
                      <button
                        onClick={() => deleteTestCase(activeFile.id, testCase.id)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-70">Input</label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(activeFile.id, testCase.id, { input: e.target.value })}
                      className={`w-full h-16 p-2 rounded border focus:outline-none focus:border-purple-400 font-mono text-xs resize-none ${
                        isDarkMode
                          ? "bg-gray-900/50 text-gray-100 border-gray-600/30"
                          : "bg-gray-50 text-gray-900 border-gray-300"
                      }`}
                      placeholder="Input..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-70">Expected Output</label>
                    <textarea
                      value={testCase.expectedOutput || ""}
                      onChange={(e) => updateTestCase(activeFile.id, testCase.id, { expectedOutput: e.target.value })}
                      className={`w-full h-16 p-2 rounded border focus:outline-none focus:border-purple-400 font-mono text-xs resize-none ${
                        isDarkMode
                          ? "bg-gray-900/50 text-gray-100 border-gray-600/30"
                          : "bg-gray-50 text-gray-900 border-gray-300"
                      }`}
                      placeholder="Expected output..."
                    />
                  </div>

                  {testCase.actualOutput && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium opacity-70">Actual Output</label>
                        <button
                          onClick={() => copyToClipboard(testCase.actualOutput!, `output-${testCase.id}`)}
                          className="p-1 hover:bg-gray-500/20 rounded transition-colors"
                        >
                          {copiedStates[`output-${testCase.id}`] ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <pre
                        className={`w-full h-16 p-2 rounded border font-mono text-xs whitespace-pre-wrap overflow-auto ${
                          isDarkMode
                            ? "bg-gray-900/70 text-green-400 border-gray-600/30"
                            : "bg-gray-100 text-green-600 border-gray-300"
                        }`}
                      >
                        {testCase.actualOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
