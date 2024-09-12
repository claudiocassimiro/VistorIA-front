"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CameraIcon, UploadIcon, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const comodos = [
  "Sala de Estar",
  "Terraço",
  "Varanda",
  "Cozinha",
  "Área de Serviço",
  "Quarto",
  "Banheiro",
  "Sala de Jantar",
  "Escritório",
  "Garagem",
];

export function AppPage() {
  const [fotos, setFotos] = useState<{ [key: string]: File[] }>({});
  const [progressoUpload, setProgressoUpload] = useState<{
    [key: string]: number;
  }>({});
  const [estaEnviando, setEstaEnviando] = useState(false);
  const { toast } = useToast();

  const handleUploadArquivo = (
    comodo: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = event.target.files;
    if (arquivos) {
      setFotos((fotosAnteriores) => ({
        ...fotosAnteriores,
        [comodo]: [...(fotosAnteriores[comodo] || []), ...Array.from(arquivos)],
      }));
    }
  };

  const removerFoto = (comodo: string, index: number) => {
    setFotos((fotosAnteriores) => ({
      ...fotosAnteriores,
      [comodo]: fotosAnteriores[comodo].filter((_, i) => i !== index),
    }));
  };

  const enviarTodasFotos = async () => {
    const todosComodos = Object.keys(fotos);
    const temFotosParaEnviar = todosComodos.some(
      (comodo) => fotos[comodo]?.length > 0
    );

    if (!temFotosParaEnviar) {
      toast({
        title: "Sem fotos para enviar",
        description: "Por favor, selecione algumas fotos primeiro.",
        variant: "destructive",
      });
      return;
    }

    setEstaEnviando(true);
    setProgressoUpload(
      todosComodos.reduce((acc, comodo) => ({ ...acc, [comodo]: 0 }), {})
    );

    const formData = new FormData();
    todosComodos.forEach((comodo) => {
      fotos[comodo]?.forEach((arquivo, index) => {
        formData.append("fotos", arquivo, `${comodo}_${index}_${arquivo.name}`);
        formData.append("room", comodo);
      });
    });

    try {
      const resposta = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!resposta.ok) {
        throw new Error(`Erro HTTP! status: ${resposta.status}`);
      }

      toast({
        title: "Upload bem-sucedido",
        description: "Todas as fotos foram enviadas com sucesso.",
      });

      setFotos({});
    } catch (erro) {
      console.error("Falha no upload:", erro);
      toast({
        title: "Erro no upload",
        description:
          "Ocorreu um erro ao enviar as fotos. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEstaEnviando(false);
      setProgressoUpload({});
    }
  };

  return (
    <section className="w-screen lg:h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-[1280px] p-4 my-0 mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload de Fotos para Inspeção de Imóveis
        </h1>
        <Tabs defaultValue={comodos[0]}>
          <TabsList className="flex flex-wrap justify-center h-auto mb-8 w-full">
            {comodos.map((comodo) => (
              <TabsTrigger
                key={comodo}
                value={comodo}
                className="flex-1 min-w-[120px] px-3 py-2 text-sm rounded-md m-1 bg-white border border-gray-200 hover:bg-gray-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {comodo}
              </TabsTrigger>
            ))}
          </TabsList>
          {comodos.map((comodo) => (
            <TabsContent key={comodo} value={comodo} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{comodo}</CardTitle>
                  <CardDescription>
                    Faça upload ou tire fotos do(a) {comodo.toLowerCase()}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`${comodo}-upload`}>
                        Fazer Upload de Foto
                      </Label>
                      <div className="mt-1 flex items-center">
                        <Input
                          id={`${comodo}-upload`}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleUploadArquivo(comodo, e)}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`${comodo}-upload`}
                          className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <UploadIcon className="h-4 w-4 inline-block mr-1" />
                          Escolher arquivos
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`${comodo}-camera`}>Tirar Foto</Label>
                      <div className="mt-1">
                        <Button
                          id={`${comodo}-camera`}
                          variant="outline"
                          className="w-full"
                        >
                          <CameraIcon className="h-4 w-4 mr-1" />
                          Abrir Câmera
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                    {fotos[comodo] && fotos[comodo].length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {fotos[comodo].map((foto, index) => (
                          <div key={index} className="relative">
                            <Image
                              src={URL.createObjectURL(foto)}
                              alt={`Foto ${index + 1} do(a) ${comodo}`}
                              width={200}
                              height={200}
                              className="rounded-md object-cover w-full h-32"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1"
                              onClick={() => removerFoto(comodo, index)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500">
                        Nenhuma foto carregada ainda
                      </p>
                    )}
                  </div>
                  {progressoUpload[comodo] > 0 && (
                    <Progress
                      value={progressoUpload[comodo]}
                      className="w-full"
                    />
                  )}
                  <Button
                    className="w-full mb-6"
                    onClick={enviarTodasFotos}
                    disabled={
                      estaEnviando ||
                      Object.values(fotos).every((f) => f.length === 0)
                    }
                  >
                    {estaEnviando ? "Enviando..." : "Enviar todas as fotos"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
