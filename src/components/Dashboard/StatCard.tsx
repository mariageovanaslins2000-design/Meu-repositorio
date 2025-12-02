import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export const StatCard = ({ title, value, icon: Icon, trend }: StatCardProps) => {
  return (
    <Card className="shadow-elegant">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <p className={`text-sm ${trend.positive ? "text-green-600" : "text-red-600"}`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-gradient-salmon flex items-center justify-center">
            <Icon className="w-6 h-6 text-secondary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
