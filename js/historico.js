import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyListDiv = document.getElementById('history-list');
const btnFilter = document.getElementById('btn-filter');

// Guardar os dados localmente para facilitar a partilha
let allOrders = [];

async function loadHistory(startDate = null, endDate = null) {
    try {
        const q = query(collection(db, "service_orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        historyListDiv.innerHTML = "";
        allOrders = [];

        if (querySnapshot.empty) {
            historyListDiv.innerHTML = "<p>Nenhuma Ordem de Serviço registada.</p>";
            return;
        }

        let html = "";
        querySnapshot.forEach((doc) => {
            const os = doc.data();
            os.id = doc.id;
            allOrders.push(os);
            
            // Filtragem por data (se preenchida)
            if (startDate || endDate) {
                const osDate = os.timeStart ? os.timeStart.split('T')[0] : '';
                if (startDate && osDate < startDate) return;
                if (endDate && osDate > endDate) return;
            }

            html += `
                <div style="background: #fff; margin-bottom: 15px; padding: 15px; border-radius: 6px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0; color: #007BFF;">Cliente: ${os.clientName}</h3>
                    <p style="margin: 4px 0;"><strong>Equipamento:</strong> ${os.equipment} (${os.serviceNature} / ${os.serviceArea})</p>
                    <p style="margin: 4px 0;"><strong>Manutentor:</strong> ${os.technicianName}</p>
                    <p style="margin: 4px 0;"><strong>Descrição:</strong> ${os.description}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #666;">
                        <strong>Início:</strong> ${os.timeStart} | <strong>Fim:</strong> ${os.timeEnd} | <strong>Base:</strong> ${os.timeBase}
                    </p>
                    <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 12px; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">Assinaturas OK</span>
                        <button onclick="shareReport('${os.id}')" style="background: #28a745; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-size: 12px;">Partilhar / Enviar Relatório</button>
                    </div>
                </div>
            `;
        });

        if (html === "") {
            historyListDiv.innerHTML = "<p>Nenhuma O.S. encontrada para o intervalo de datas selecionado.</p>";
        } else {
            historyListDiv.innerHTML = html;
        }

    } catch (error) {
        console.error("Erro ao carregar histórico: ", error);
        historyListDiv.innerHTML = "<p>Erro ao carregar os dados do histórico.</p>";
    }
}

// Função global para partilhar o relatório da O.S. selecionada
window.shareReport = function(osId) {
    const os = allOrders.find(item => item.id === osId);
    if (!os) return;

    const reportText = `--- RELATÓRIO DE ASSISTÊNCIA TÉCNICA ---\n` +
                       `Cliente: ${os.clientName}\n` +
                       `Equipamento: ${os.equipment}\n` +
                       `Tipo: ${os.serviceNature} (${os.serviceArea})\n` +
                       `Manutentor: ${os.technicianName}\n` +
                       `Descrição: ${os.description}\n` +
                       `Início: ${os.timeStart} | Fim: ${os.timeEnd}\n` +
                       `Regresso à Base: ${os.timeBase}\n` +
                       `----------------------------------------\n` +
                       `Estado: Assinado por ambas as partes.`;

    // Usar a API de partilha nativa do dispositivo (funciona perfeitamente em tablets/telemóveis para WhatsApp/Email)
    if (navigator.share) {
        navigator.share({
            title: 'Relatório de Assistência Técnica',
            text: reportText,
        }).catch((error) => console.log('Erro ao partilhar:', error));
    } else {
        // Fallback caso o navegador do PC não suporte
        navigator.clipboard.writeText(reportText);
        alert("Relatório copiado para a área de transferência! Podes colar no WhatsApp ou E-mail.");
    }
};

// Evento do botão de filtrar
btnFilter.addEventListener('click', () => {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    loadHistory(start, end);
});

// Carregar todo o histórico inicialmente
loadHistory();