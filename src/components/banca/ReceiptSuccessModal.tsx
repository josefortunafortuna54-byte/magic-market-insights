import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ReceiptSuccessModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="relative mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.25 }}
              transition={{ type: "spring", damping: 14, stiffness: 100, delay: 0.2 }}
              className="absolute inset-0 rounded-full bg-success"
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 150 }}
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-success shadow-lg shadow-success/50"
            >
              <Check className="h-10 w-10 text-white" />
            </motion.div>
          </div>
          <DialogTitle className="font-display text-xl">Comprovante recebido</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Obrigado! O seu comprovante foi enviado para revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 rounded-full border border-warning/40 bg-warning/15 px-4 py-1.5 mx-auto">
          <Clock className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-bold text-warning">Pendente</span>
        </div>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          A equipa irá analisar e aprovar o teu pagamento em breve.
        </p>

        <DialogFooter className="flex-col sm:flex-col">
          <Button variant="premium" className="w-full" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}