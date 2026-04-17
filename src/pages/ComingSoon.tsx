import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

const ComingSoon = ({ title }: { title: string }) => (
  <AppLayout>
    <div className="max-w-2xl mx-auto animate-slide-up">
      <h1 className="font-display text-3xl font-bold mb-1">{title}</h1>
      <p className="text-muted-foreground mb-6">Próximamente en la siguiente fase.</p>
      <Card className="glass-card p-12 text-center">
        <Construction className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Esta sección llega en la siguiente entrega.</p>
      </Card>
    </div>
  </AppLayout>
);

export default ComingSoon;
