import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyListDiv = document.getElementById('history-list');
const filtroCliente = document.getElementById('filtro-cliente');
const filtroDataInicio = document.getElementById('filtro-data-inicio');
const filtroDataFim = document.getElementById('filtro-data-fim');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnLimpar = document.getElementById('btn-limpar');

let todasAsOrdens = []; // Array para guardar os dados e filtrar localmente sem reconsultar sempre o Firebase

// 1. Carregar lista de clientes para o menu de filtro
async function carregarClientesFiltro() {
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        filtroCliente.innerHTML = '<option value="">Todos os clientes</option>';
        querySnapshot.forEach((doc) => {
            const client = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = client.name || client.razaoSocial;
            filtroCliente.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar clientes para o filtro:", error);
    }
}

// 2. Carregar todas as Ordens de Serviço do Firebase
async function carregarHistorico() {
    try {
        const querySnapshot = await getDocs(collection(db, "service_orders"));
        todasAsOrdens = [];

        querySnapshot.forEach((documento) => {
            todasAsOrdens.push({
                id: documento.id,
                ...documento.data()
            });
        });

        renderizarLista(todasAsOrdens);
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historyListDiv.innerHTML = "<p>Erro ao carregar o histórico.</p>";
    }
}

// 3. Renderizar a lista de O.S. no ecrã
function renderizarLista(dados) {
    if (dados.length === 0) {
        historyListDiv.innerHTML = "<p>Nenhuma Ordem de Serviço encontrada com estes filtros.</p>";
        return;
    }

    let html = "<ul style='list-style: none; padding: 0;'>";
    
    dados.forEach((os) => {
        html += `
            <li style="background: #fff; margin-bottom: 12px; padding: 15px; border-radius: 6px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong>Cliente:</strong> ${os.clientName || 'N/A'}<br>
                <strong>Equipamento:</strong> ${os.equipment || 'N/A'}<br>
                <strong>Tipo:</strong> ${os.serviceType || 'N/A'}<br>
                <strong>Data/Início:</strong> ${os.startTime || 'N/A'}<br><br>
                
                <button onclick="gerarEEnviarRelatorio('${os.id}')" style="background: #28a745; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">
                    📄 Gerar e Partilhar Relatório
                </button>
            </li>
        `;
    });
    
    html += "</ul>";
    historyListDiv.innerHTML = html;
}

// 4. Lógica de Filtragem (Cliente e Datas)
btnFiltrar.addEventListener('click', () => {
    const clienteSelecionado = filtroCliente.value;
    const dataInicio = filtroDataInicio.value; 
    const dataFim = filtroDataFim.value;       

    const filtradas = todasAsOrdens.filter(os => {
        if (clienteSelecionado && os.clientId !== clienteSelecionado) {
            return false;
        }

        if (os.startTime) {
            const dataOS = os.startTime.split('T')[0];

            if (dataInicio && dataOS < dataInicio) {
                return false;
            }
            if (dataFim && dataOS > dataFim) {
                return false;
            }
        }

        return true;
    });

    renderizarLista(filtradas);
});

// 5. Botão Limpar Filtros
btnLimpar.addEventListener('click', () => {
    filtroCliente.value = "";
    filtroDataInicio.value = "";
    filtroDataFim.value = "";
    renderizarLista(todasAsOrdens);
});

// 6. Função otimizada: Gera o PDF e abre a partilha nativa (WhatsApp/E-mail com o ficheiro anexo)
async function gerarEEnviarRelatorio(osId) {
    try {
        const docRef = doc(db, "service_orders", osId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Ordem de Serviço não encontrada!");
            return;
        }

        const data = docSnap.data();
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        // Construção do PDF
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(16);
        docPDF.text("Relatório de Assistência Técnica", 20, 20);

        docPDF.setFontSize(11);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Cliente: ${data.clientName || 'N/A'}`, 20, 35);
        docPDF.text(`Equipamento: ${data.equipment || 'N/A'}`, 20, 45);
        docPDF.text(`Tipo de Serviço: ${data.serviceType || 'N/A'}`, 20, 55);
        docPDF.text(`Manutentor: ${data.technicianName || 'N/A'}`, 20, 65);
        
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Descrição do Serviço:", 20, 80);
        docPDF.setFont("helvetica", "normal");
        
        const splitDescription = docPDF.splitTextToSize(data.description || 'Sem descrição', 170);
        docPDF.text(splitDescription, 20, 90);

        let posY = 120 + (splitDescription.length * 5);
        docPDF.text(`Início: ${data.startTime || '-'} | Fim: ${data.endTime || '-'}`, 20, posY);
        posY += 10;
        docPDF.text(`Regresso à Base: ${data.returnBase || '-'}`, 20, posY);

        posY += 20;
        if (data.technicianSignature) {
            docPDF.addImage(data.technicianSignature, 'PNG', 20, posY, 60, 25);
            docPDF.text("Assinatura Manutentor", 20, posY + 30);
        }

        if (data.customerSignature) {
            docPDF.addImage(data.customerSignature, 'PNG', 120, posY, 60, 25);
            docPDF.text("Assinatura Cliente", 120, posY + 30);
        }

        // Criar o ficheiro PDF em formato Blob e preparar objeto File
        const pdfBlob = docPDF.output('blob');
        const fileName = `Relatorio_OS_${osId}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Tentar usar a partilha nativa do dispositivo (abre WhatsApp, E-mail, etc. com o PDF anexo)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    title: 'Relatório de Assistência Técnica',
                    text: `Segue o relatório técnico referente ao equipamento ${data.equipment}.`,
                    files: [pdfFile],
                });
                return; 
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Utilizador cancelou ou erro na partilha:", error);
                } else {
                    return; 
                }
            }
        }

        // Fallback: Se o browser não suportar partilha direta de ficheiros, faz o download normal
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        alert("Relatório gerado e descarregado com sucesso!");

    } catch (error) {
        console.error("Erro ao gerar o relatório:", error);
        alert("Ocorreu um erro ao processar o relatório.");
    }
}

window.gerarEEnviarRelatorio = gerarEEnviarRelatorio;

// Executar ao abrir a página
carregarClientesFiltro();
carregarHistorico();
