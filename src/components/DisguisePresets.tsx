import { ScrollArea } from "@/components/ui/scroll-area";

interface Preset {
  label: string;
  url: string;
  icon: string;
  category: string;
}

export const DISGUISE_PRESETS: Preset[] = [
  // Google Suite
  { category: "Google", label: "Google", url: "https://google.com", icon: "https://www.google.com/favicon.ico" },
  { category: "Google", label: "Google Docs", url: "https://docs.google.com", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" },
  { category: "Google", label: "Google Slides", url: "https://slides.google.com", icon: "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico" },
  { category: "Google", label: "Google Sheets", url: "https://sheets.google.com", icon: "https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico" },
  { category: "Google", label: "Google Classroom", url: "https://classroom.google.com", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
  { category: "Google", label: "Google Drive", url: "https://drive.google.com", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  { category: "Google", label: "Gmail", url: "https://mail.google.com", icon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
  // School Tools
  { category: "School", label: "Khan Academy", url: "https://khanacademy.org", icon: "https://cdn.kastatic.org/images/favicon.ico" },
  { category: "School", label: "Desmos", url: "https://desmos.com/calculator", icon: "https://desmos.com/assets/img/favicon.ico" },
  { category: "School", label: "Quizlet", url: "https://quizlet.com", icon: "https://quizlet.com/favicon.ico" },
  { category: "School", label: "Kahoot", url: "https://kahoot.it", icon: "https://kahoot.com/wp-content/uploads/2022/01/cropped-favicon-192x192.png" },
  { category: "School", label: "Nearpod", url: "https://nearpod.com", icon: "https://nearpod.com/favicon.ico" },
  { category: "School", label: "Schoology", url: "https://app.schoology.com", icon: "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico" },
  { category: "School", label: "Canvas", url: "https://canvas.instructure.com", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
  { category: "School", label: "Wikipedia", url: "https://en.wikipedia.org", icon: "https://en.wikipedia.org/favicon.ico" },
  { category: "School", label: "Duolingo", url: "https://duolingo.com", icon: "https://duolingo.com/favicon.ico" },
];

const CATEGORIES = ["Google", "School"];

interface Props {
  onSelect: (preset: { label: string; url: string; icon: string }) => void;
  selectedUrl: string;
}

export default function DisguisePresets({ onSelect, selectedUrl }: Props) {
  return (
    <ScrollArea className="max-h-56">
      <div className="space-y-3 pr-2">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {DISGUISE_PRESETS.filter((p) => p.category === cat).map((p) => (
                <button
                  key={p.label}
                  onClick={() => onSelect(p)}
                  title={p.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedUrl === p.url
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <img
                    src={p.icon}
                    alt={p.label}
                    className="w-5 h-5 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="truncate w-full text-center leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
