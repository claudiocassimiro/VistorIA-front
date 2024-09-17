"use client";

import { useState } from "react";
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
import { CameraIcon, UploadIcon, XIcon } from "lucide-react";
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

export function AppPage() {
  const [comodos, setComodos] = useState<string[]>(initialComodos);

  const [novoComodo, setNovoComodo] = useState("");

  // Função para adicionar novo cômodo
  const adicionarComodo = () => {
    if (novoComodo.trim() && !comodos.includes(novoComodo)) {
      setComodos((prevComodos) => [...prevComodos, novoComodo]);
      setNovoComodo(""); // Limpa o campo de entrada
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
  const [nomeVistoriador, setNomeVistoriador] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const { toast } = useToast();
  const [tipoVistoria, setTipoVistoria] = useState<"entrada" | "saida">(
    "entrada"
  );
  const [nomeEdificio, setNomeEdificio] = useState("");
  const [locador, setLocador] = useState("");
  const [locatario, setLocatario] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [enderecoImovel, setEnderecoImovel] = useState("");
  const [numeroApartamento, setNumeroApartamento] = useState("");

  const handleUploadArquivo = (
    comodo: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = event.target.files;
    if (arquivos) {
      setFotos((fotosAnteriores) => ({
        ...fotosAnteriores,
        [comodo]: [
          ...(fotosAnteriores[comodo] || []),
          ...Array.from(arquivos).map((arquivo) => ({
            arquivo,
            observacao: "",
          })),
        ],
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

  const enviarTodasFotos = async () => {
    if (!nomeVistoriador.trim()) {
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
    formData.append("nome_vistoriador", nomeVistoriador);
    formData.append("tipo_vistoria", tipoVistoria);
    formData.append("nome_edificio", nomeEdificio);
    formData.append("locador", locador);
    formData.append("locatario", locatario);
    formData.append("data_inicio", dataInicio ? dataInicio.toISOString() : "");
    formData.append("endereco_imovel", enderecoImovel);
    formData.append("numero_apartamento", numeroApartamento);
    todosComodos.forEach((comodo) => {
      fotos[comodo]?.forEach((foto, index) => {
        formData.append(
          "file",
          foto.arquivo,
          `${comodo}_${index}_${foto.arquivo.name}`
        );
        formData.append(`observacao_${comodo}_${index}`, foto.observacao);
      });
    });

    try {
      const resposta = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

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
        setNomeVistoriador("");
        setTipoVistoria("entrada");
        setNomeEdificio("");
        setLocador("");
        setLocatario("");
        setDataInicio(undefined);
        setEnderecoImovel("");
        setNumeroApartamento("");
        setNovoComodo(""); // Limpa o campo de novo cômodo
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
      setNomeVistoriador("");
      setTipoVistoria("entrada");
      setNomeEdificio("");
      setLocador("");
      setLocatario("");
      setDataInicio(undefined);
      setEnderecoImovel("");
      setNumeroApartamento("");
      setNovoComodo(""); // Limpa o campo de novo cômodo
      setComodos(initialComodos); // Remove os cômodos extras
      setPdfUrl("");
    }
  };

  return (
    <section className="w-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-[1280px] p-4 my-0 mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload de Fotos para Inspeção de Imóveis
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="nomeVistoriador">Nome do Vistoriador</Label>
            <Input
              id="nomeVistoriador"
              value={nomeVistoriador}
              onChange={(e) => setNomeVistoriador(e.target.value)}
              placeholder="Digite o nome do vistoriador"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tipoVistoria">Tipo de Vistoria</Label>
            <Select
              onValueChange={(value: "entrada" | "saida") =>
                setTipoVistoria(value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o tipo de vistoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Vistoria de Entrada</SelectItem>
                <SelectItem value="saida">Vistoria de Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nomeEdificio">Nome do Edifício</Label>
            <Input
              id="nomeEdificio"
              value={nomeEdificio}
              onChange={(e) => setNomeEdificio(e.target.value)}
              placeholder="Digite o nome do edifício"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="locador">Locador</Label>
            <Input
              id="locador"
              value={locador}
              onChange={(e) => setLocador(e.target.value)}
              placeholder="Digite o nome do locador"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="locatario">Locatário</Label>
            <Input
              id="locatario"
              value={locatario}
              onChange={(e) => setLocatario(e.target.value)}
              placeholder="Digite o nome do locatário"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Data de Início</Label>
            <Calendar
              mode="single"
              selected={dataInicio}
              onSelect={setDataInicio}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="enderecoImovel">Endereço do Imóvel</Label>
            <Input
              id="enderecoImovel"
              value={enderecoImovel}
              onChange={(e) => setEnderecoImovel(e.target.value)}
              placeholder="Digite o endereço do imóvel"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="numeroApartamento">Número do Apartamento</Label>
            <Input
              id="numeroApartamento"
              value={numeroApartamento}
              onChange={(e) => setNumeroApartamento(e.target.value)}
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
              value={novoComodo}
              onChange={(e) => setNovoComodo(e.target.value)}
              placeholder="Digite o nome do novo cômodo"
              className="mt-1 mr-2"
            />
            <Button onClick={adicionarComodo}>Adicionar</Button>
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
                                  <DialogTitle>Observação da Foto</DialogTitle>
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
                  <Button
                    className="w-full mb-6"
                    onClick={enviarTodasFotos}
                    disabled={
                      estaEnviando ||
                      Object.values(fotos).every((f) => f.length === 0) ||
                      !nomeVistoriador.trim() ||
                      !tipoVistoria || // Verifica se o tipo de vistoria está selecionado
                      !nomeEdificio.trim() || // Verifica se o nome do edifício está preenchido
                      !locador.trim() || // Verifica se o locador está preenchido
                      !locatario.trim() || // Verifica se o locatário está preenchido
                      !enderecoImovel.trim() || // Verifica se o endereço do imóvel está preenchido
                      !numeroApartamento.trim() // Verifica se o número do apartamento está preenchido
                    }
                  >
                    {estaEnviando ? "Enviando..." : "Enviar todas as fotos"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
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
