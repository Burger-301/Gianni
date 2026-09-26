import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientSelect = document.getElementById('client-select');
const form = document.getElementById('os-form');

const VALOR_HORA_FIXO = 200.00; 

function ajustarCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

const techCanvas = document.getElementById('tech-pad');
const clientCanvas = document.getElementById('client-pad');

ajustarCanvas(techCanvas);
ajustarCanvas(clientCanvas);

const techPad = new SignaturePad(techCanvas);
const clientPad = new SignaturePad(clientCanvas);

document.getElementById('clear-tech').addEventListener('click', () => techPad.clear());
document.getElementById('clear-client').addEventListener('click', () => clientPad.clear());

async function loadClientsDropdown() {
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        clientSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        if (querySnapshot.empty) {
            clientSelect.innerHTML = '<option value="">Nenhum cliente cadastrado</option>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const client = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            
            option.dataset.clientName = client.name || client.razaoSocial || 'Cliente sem nome';
            option.dataset.clientEmail = client.email || '';

            option.textContent = `${client.name || client.razaoSocial} (${client.document || client.cnpj || 'N/A'})`;
            clientSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar clientes: ", error);
        clientSelect.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

loadClientsDropdown();

// Função de cálculo de minutos somando os turnos de manhã e tarde
function calcularMinutosTrabalhados(startM, endM, startT, endT) {
    let minutosTotais = 0;

    if (startM && endM) {
        const diffM = new Date(endM) - new Date(startM);
        if (diffM > 0) minutosTotais += diffM / (1000 * 60);
    }

    if (startT && endT) {
        const diffT = new Date(endT) - new Date(startT);
        if (diffT > 0) minutosTotais += diffT / (1000 * 60);
    }

    if (minutosTotais < 0) minutosTotais = 0;

    const horasDecimais = minutosTotais / 60;
    const valorDasHoras = horasDecimais * VALOR_HORA_FIXO;

    const horasExatas = Math.floor(minutosTotais / 60);
    const minutosRestantes = minutosTotais % 60;
    const formatadoTexto = `${horasExatas}h ${minutosRestantes}m`;

    return {
        totalHours: horasDecimais.toFixed(2),
        totalHoursText: formatadoTexto,
        totalValue: valorDasHoras.toFixed(2)
    };
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (techPad.isEmpty() || clientPad.isEmpty()) {
        alert("Ambas as assinaturas (Manutentor e Cliente) são obrigatórias.");
        return;
    }

    const selectedOption = clientSelect.options[clientSelect.selectedIndex];

    const timeStartManha = document.getElementById('time-start-manha').value;
    const timeEndManha = document.getElementById('time-end-manha').value;
    const timeStartTarde = document.getElementById('time-start-tarde').value;
    const timeEndTarde = document.getElementById('time-end-tarde').value;

    const calc = calcularMinutosTrabalhados(timeStartManha, timeEndManha, timeStartTarde, timeEndTarde);

    const osData = {
        clientId: clientSelect.value,
        clientName: selectedOption.dataset.clientName,
        clientEmail: selectedOption.dataset.clientEmail,
        equipment: document.getElementById('equipment').value,
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        serialNumber: document.getElementById('serial-number').value,
        serviceNature: document.getElementById('service-nature').value,
        serviceArea: document.getElementById('service-area').value,
        timeStartManha: timeStartManha || "",
        timeEndManha: timeEndManha || "",
        timeStartTarde: timeStartTarde || "",
        timeEndTarde: timeEndTarde || "",
        timeEnd: timeEndTarde || "", // Mantém compatibilidade geral para encerramento
        totalHours: calc.totalHours,
        totalHoursText: calc.totalHoursText,
        hourlyRateUsed: VALOR_HORA_FIXO.toFixed(2),
        totalValue: calc.totalValue,
        description: document.getElementById('description').value,
        paymentTerms: document.getElementById('payment-terms').value,
        technicianName: document.getElementById('technician-name').value,
        technicianSignature: techPad.toDataURL(),
        customerSignature: clientPad.toDataURL(),
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "service_orders"), osData);
        alert("Ordem de Serviço registada com sucesso!");
        form.reset();
        techPad.clear();
        clientPad.clear();
        
        window.location.href = "historico.html";
    } catch (error) {
        console.error("Erro ao guardar O.S.: ", error);
        alert("Ocorreu um erro ao gravar a O.S. Verifica a consola.");
    }
});
