import { Button } from "./button/Button";
import { SettingsSVG } from "./ui/icons";
import Logo from "../components/Logo";

export interface HeaderProps {
  title?: string;
  logo?: React.ReactNode;
  height?: number;
  onSettingsClicked?: () => void;
}

export function Header({
  title,
  height = 56,
  onSettingsClicked,
}: HeaderProps) {
  return (
    <>
      {/* Top announcement bar */}
      <div className="w-full bg-brand-background text-brand-text-primary text-center py-2 text-sm flex items-center justify-center border-b border-brand-border">
        <span className="animate-pulse">🚀</span>
        <span className="ml-2">
          <a 
            href="https://knotie-ai.pro" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-knotie-400 hover:text-knotie-300"
          >
            Knotie-AI Pro
          </a>
          {" "}is Live Now at Public Beta. Join our exclusive waitlist for early access and hear about special offers!
        </span>
        <span className="animate-pulse ml-2">🎯</span>
      </div>
      
      <header
        className="flex flex-row items-center justify-between px-4 bg-brand-background border-b border-brand-border"
        style={{ height: `${height}px` }}
      >
        <div className="flex items-center">
          <Logo />
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <h1 className="font-mono text-lg md:text-xl text-brand-text-primary font-semibold">
            Customer Showcase Live App by Kno2gether
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {onSettingsClicked && (
            <Button
              state="secondary"
              size="medium"
              onClick={onSettingsClicked}
              className="bg-brand-border hover:bg-brand-hover text-brand-text-primary"
            >
              <SettingsSVG />
            </Button>
          )}
          <img 
            src="/knolabs350180logo.png" 
            alt="Knolabs Agency" 
            className="h-8"
          />
        </div>
      </header>
    </>
  );
}
