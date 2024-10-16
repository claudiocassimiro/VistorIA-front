"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Progress } from "@/src/components/ui/progress";
import { UploadIcon, XIcon } from "lucide-react";
import { useToast } from "@/src/hooks/use-toast";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/src/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";

const initialComodos = [
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

const mensagens = [
  "Processando...",
  "Calma que eu to criando o documento...",
  "Muita foto, deixa eu pensar...",
  "Não mexe em nada, tô pensando...",
  "Adicionando descrições as fotos...",
  "Adicionando as fotos no PDF...",
  "Retoques finais...",
];

interface FormData {
  nomeVistoriador: string;
  tipoVistoria: "entrada" | "saida";
  nomeEdificio: string;
  locador: string;
  locatario: string;
  dataInicio: Date | undefined;
  enderecoImovel: string;
  numeroApartamento: string;
  novoComodo: string | undefined;
  observacoesGerais: string;
}

export function AppPage() {
  const [comodos, setComodos] = useState<string[]>(initialComodos);
  const { register, handleSubmit, control, setValue, watch, reset } =
    useForm<FormData>({
      defaultValues: {
        nomeVistoriador: "",
        tipoVistoria: "entrada",
        nomeEdificio: "",
        locador: "",
        locatario: "",
        dataInicio: undefined,
        enderecoImovel: "",
        numeroApartamento: "",
        novoComodo: undefined,
        observacoesGerais: "",
      },
    });

  // Função para adicionar novo cômodo
  const adicionarComodo = () => {
    const novoComodo = watch("novoComodo");
    if (novoComodo) {
      const comodoLimpo = novoComodo.replace(/[()./\-_\\,e]/g, "").trim();
      if (comodoLimpo && !comodos.includes(comodoLimpo)) {
        setComodos((prevComodos) => [...prevComodos, comodoLimpo]);
        setValue("novoComodo", ""); // Limpa o campo de entrada
      }
    }
  };

  interface Foto {
    arquivo: File;
    observacao: string;
  }

  const [fotos, setFotos] = useState<{ [key: string]: Foto[] }>({});
  const [progressoUpload, setProgressoUpload] = useState<{
    [key: string]: number;
  }>({});
  const [estaEnviando, setEstaEnviando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const { toast } = useToast();

  const compactarImagem = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const novoArquivo = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(novoArquivo);
              } else {
                reject(new Error("Falha ao compactar a imagem"));
              }
            },
            "image/jpeg",
            0.7
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadArquivo = async (
    comodo: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = event.target.files;
    if (arquivos) {
      const fotosCompactadas = await Promise.all(
        Array.from(arquivos).map(async (arquivo) => ({
          arquivo: await compactarImagem(arquivo),
          observacao: "",
        }))
      );

      setFotos((fotosAnteriores) => ({
        ...fotosAnteriores,
        [comodo]: [...(fotosAnteriores[comodo] || []), ...fotosCompactadas],
      }));
    }
  };

  const removerFoto = (comodo: string, index: number) => {
    setFotos((fotosAnteriores) => ({
      ...fotosAnteriores,
      [comodo]: fotosAnteriores[comodo].filter((_, i) => i !== index),
    }));
  };

  const adicionarObservacao = (
    comodo: string,
    index: number,
    observacao: string
  ) => {
    setFotos((fotosAnteriores) => ({
      ...fotosAnteriores,
      [comodo]: fotosAnteriores[comodo].map((foto, i) =>
        i === index ? { ...foto, observacao } : foto
      ),
    }));
  };

  const enviarTodasFotos = async (data: FormData) => {
    if (!data.nomeVistoriador.trim()) {
      toast({
        title: "Nome do vistoriador não informado",
        description:
          "Por favor, informe o nome do vistoriador antes de enviar as fotos.",
        variant: "destructive",
      });
      return;
    }

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
    formData.append("nome_vistoriador", data.nomeVistoriador);
    formData.append("tipo_vistoria", data.tipoVistoria);
    formData.append("nome_edificio", data.nomeEdificio);
    formData.append("locador", data.locador);
    formData.append("locatario", data.locatario);
    formData.append(
      "data_inicio",
      data.dataInicio ? data.dataInicio.toISOString() : ""
    );
    formData.append("endereco_imovel", data.enderecoImovel);
    formData.append("numero_apartamento", data.numeroApartamento);
    formData.append("observacoes_gerais", data.observacoesGerais);
    const observacoes: { [key: string]: string } = {};
    const rooms: { [key: string]: string } = {};
    todosComodos.forEach((comodo) => {
      fotos[comodo]?.forEach((foto, index) => {
        const chave = `${comodo
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}_${index}`;
        formData.append("file", foto.arquivo, `${chave}_${foto.arquivo.name}`);
        observacoes[chave] = foto.observacao;
        rooms[comodo] = comodo;
      });
    });
    formData.append("observacoes", JSON.stringify(observacoes));
    formData.append("rooms", JSON.stringify(rooms));

    try {
      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!resposta.ok) {
        throw new Error(`Erro HTTP! status: ${resposta.status}`);
      }

      // Verifique o tipo de conteúdo da resposta
      const contentType = resposta.headers.get("content-type");
      if (contentType && contentType.includes("application/pdf")) {
        const blob = await resposta.blob();
        const pdfUrl = URL.createObjectURL(blob);
        setPdfUrl(pdfUrl);

        toast({
          title: "Upload bem-sucedido",
          description:
            "Todas as fotos foram enviadas com sucesso. O PDF da vistoria está pronto para download.",
        });

        // Limpar todos os campos após o upload bem-sucedido
        setFotos({});
        reset();
        setComodos((prevComodos) =>
          prevComodos.filter((comodo) => !comodo.startsWith("Novo"))
        ); // Remove os cômodos extras
      } else {
        throw new Error("A resposta do servidor não é um PDF válido");
      }
    } catch (erro) {
      console.error("Falha no upload:", erro);
      toast({
        title: "Erro no upload",
        description:
          "Ocorreu um erro ao enviar as fotos ou gerar o PDF. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEstaEnviando(false);
      setProgressoUpload({});
    }
  };

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = "vistoria.pdf"; // Nome do arquivo para download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Resetando o estado do aplicativo após o download
      setFotos({});
      reset();
      setComodos(initialComodos); // Remove os cômodos extras
      setPdfUrl("");
    }
  };

  const [mensagemAtual, setMensagemAtual] = useState(mensagens[0]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setMensagemAtual(mensagens[Math.floor(Math.random() * mensagens.length)]);
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <section className="w-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-[1280px] p-4 my-0 mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload de Fotos para Inspeção de Imóveis
        </h1>
        <form onSubmit={handleSubmit(enviarTodasFotos)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="nomeVistoriador">Nome do Vistoriador</Label>
              <Input
                id="nomeVistoriador"
                {...register("nomeVistoriador", { required: true })}
                placeholder="Digite o nome do vistoriador"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tipoVistoria">Tipo de Vistoria</Label>
              <Controller
                name="tipoVistoria"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    onValueChange={(value: "entrada" | "saida") => {
                      field.onChange(value);
                      // Forçar uma atualização do formulário
                      setValue("tipoVistoria", value, { shouldValidate: true });
                    }}
                    value={field.value}
                    defaultValue="entrada"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo de vistoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                        Vistoria de Entrada
                      </SelectItem>
                      <SelectItem value="saida">Vistoria de Saída</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="nomeEdificio">Nome do Edifício</Label>
              <Input
                id="nomeEdificio"
                {...register("nomeEdificio", { required: true })}
                placeholder="Digite o nome do edifício"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="locador">Locador</Label>
              <Input
                id="locador"
                {...register("locador", { required: true })}
                placeholder="Digite o nome do locador"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="locatario">Locatário</Label>
              <Input
                id="locatario"
                {...register("locatario", { required: true })}
                placeholder="Digite o nome do locatário"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data de Início</Label>
              <Controller
                name="dataInicio"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="enderecoImovel">Endereço do Imóvel</Label>
              <Input
                id="enderecoImovel"
                {...register("enderecoImovel", { required: true })}
                placeholder="Digite o endereço do imóvel"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="numeroApartamento">Número do Apartamento</Label>
              <Input
                id="numeroApartamento"
                {...register("numeroApartamento", { required: true })}
                placeholder="Digite o número do apartamento"
                className="mt-1"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="novoComodo">Adicionar Novo Cômodo</Label>
            <div className="flex">
              <Input
                id="novoComodo"
                {...register("novoComodo")}
                placeholder="Digite o nome do novo cômodo"
                className="mt-1 mr-2"
              />
              <Button type="button" onClick={adicionarComodo}>
                Adicionar
              </Button>
            </div>
          </div>
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
            <div className="mb-4">
              <Label htmlFor="observacoesGerais">Observações Gerais</Label>
              <Textarea
                id="observacoesGerais"
                {...register("observacoesGerais")}
                placeholder="Digite aqui as observações gerais sobre a vistoria"
                className="mt-1"
                rows={4}
              />
            </div>
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
                        <div className="mt-1 flex items-center relative">
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
                      {/* IMPLEMENTAR DEPOIS */}
                      {/* <div>
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
                      </div> */}
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                      {fotos[comodo] && fotos[comodo].length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {fotos[comodo].map((foto, index) => (
                            <div key={index} className="relative">
                              <Image
                                src={URL.createObjectURL(foto.arquivo)}
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
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="absolute bottom-1 right-1"
                                  >
                                    Observação
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="p-4 bg-white">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Observação da Foto
                                    </DialogTitle>
                                  </DialogHeader>
                                  <Textarea
                                    value={foto.observacao}
                                    onChange={(e) => {
                                      const novaObservacao = e.target.value;
                                      adicionarObservacao(
                                        comodo,
                                        index,
                                        novaObservacao
                                      );
                                    }}
                                    placeholder="Digite sua observação aqui..."
                                    className="resize-none"
                                  />
                                  <div className="mt-4 flex justify-end">
                                    <DialogClose>
                                      <Button type="button" variant="default">
                                        Confirmar
                                      </Button>
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
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
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          <Button
            className="w-full mt-6"
            type="submit"
            disabled={
              estaEnviando ||
              Object.values(fotos).every((f) => f.length === 0) ||
              // !formState.isValid ||
              pdfUrl !== "" ||
              !watch("nomeVistoriador") ||
              !watch("nomeEdificio") ||
              !watch("locador") ||
              !watch("locatario") ||
              !watch("dataInicio") ||
              !watch("enderecoImovel") ||
              !watch("numeroApartamento")
            }
          >
            {estaEnviando ? (
              <>
                {(() => {
                  return mensagemAtual;
                })()}
              </>
            ) : (
              "Enviar todas as fotos"
            )}
          </Button>
        </form>
        <div className="mt-6">
          {pdfUrl && (
            <Button className="w-full" onClick={handleDownloadPDF}>
              Baixar PDF da Vistoria
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
