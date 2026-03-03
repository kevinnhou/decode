"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@decode/ui/lib/utils";

interface Tab {
  id: string
  label: string
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, ref) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [hoverStyle, setHoverStyle] = useState({})
    const [activeStyle, setActiveStyle] = useState({ top: "0px", height: "0px" })
    const tabRefs = useRef<(HTMLDivElement | null)[]>([])

    const activeIndex = activeTab 
      ? tabs.findIndex(tab => tab.id === activeTab)
      : 0

    useEffect(() => {
      if (hoveredIndex !== null) {
        const hoveredElement = tabRefs.current[hoveredIndex]
        if (hoveredElement) {
          const { offsetTop, offsetHeight } = hoveredElement
          setHoverStyle({
            top: `${offsetTop}px`,
            height: `${offsetHeight}px`,
          })
        }
      }
    }, [hoveredIndex])

    useEffect(() => {
      const activeElement = tabRefs.current[activeIndex]
      if (activeElement) {
        const { offsetTop, offsetHeight } = activeElement
        setActiveStyle({
          top: `${offsetTop}px`,
          height: `${offsetHeight}px`,
        })
      }
    }, [activeIndex, tabs])

    useEffect(() => {
      requestAnimationFrame(() => {
        const element = tabRefs.current[activeIndex >= 0 ? activeIndex : 0]
        if (element) {
          const { offsetTop, offsetHeight } = element
          setActiveStyle({
            top: `${offsetTop}px`,
            height: `${offsetHeight}px`,
          })
        }
      })
    }, [])

    return (
      <div 
        ref={ref} 
        className={cn("relative", className)} 
        {...props}
      >
        <div className="relative">
          <div
            className="absolute left-0 w-full transition-all duration-300 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px]"
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />

          <div
            className="absolute left-[-6px] top-0 w-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-300 ease-out"
            style={activeStyle}
          />

          <div className="relative flex flex-col space-y-[6px]">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors duration-300 min-h-[36px] flex items-center",
                  index === activeIndex 
                    ? "text-[#0e0e10] dark:text-white" 
                    : "text-[#0e0f1199] dark:text-[#ffffff99]"
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  onTabChange?.(tab.id)
                }}
              >
                <span className="text-sm font-medium leading-5 whitespace-nowrap">
                  {tab.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

export { Tabs }