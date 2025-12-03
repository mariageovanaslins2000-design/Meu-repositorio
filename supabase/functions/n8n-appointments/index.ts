import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'getInfo' | 'getAvailableTimes' | 'createAppointment' | 'listAppointments' | 'cancelAppointment';
  barbershop_id: string;
  barber_id?: string;
  service_id?: string;
  date?: string;
  time?: string;
  client_name?: string;
  client_phone?: string;
  appointment_id?: string;
}

// Map Portuguese field names to English
const fieldNameMap: Record<string, string> = {
  'ação': 'action',
  'Ação': 'action',
  'barbeiro_id': 'barber_id',
  'id_do_serviço': 'service_id',
  'id_servico': 'service_id',
  'data': 'date',
  'horario': 'time',
  'hora': 'time',
  'nome_cliente': 'client_name',
  'telefone_cliente': 'client_phone',
  'telefone_do_cliente': 'client_phone',
  'id_agendamento': 'appointment_id',
};

// Map Portuguese action names to English
const actionMap: Record<string, string> = {
  'obterinfo': 'getInfo',
  'obterinformacoes': 'getInfo',
  'obterhorariosdisnponiveis': 'getAvailableTimes',
  'obterhorariosdisponiveis': 'getAvailableTimes',
  'criaagendamento': 'createAppointment',
  'criaragendamento': 'createAppointment',
  'listaragendamentos': 'listAppointments',
  'listarcompromissos': 'listAppointments',
  'listadecompromissos': 'listAppointments',
  'cancelaragendamento': 'cancelAppointment',
  'cancelarcompromisso': 'cancelAppointment',
};

// Normalize the request body
function normalizeBody(rawBody: Record<string, unknown>): RequestBody {
  const normalized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(rawBody)) {
    // Remove tabs, spaces, and special characters from key
    const cleanKey = key.replace(/[\t\s]/g, '').toLowerCase();
    
    // Map Portuguese field names to English
    let englishKey = cleanKey;
    for (const [ptKey, enKey] of Object.entries(fieldNameMap)) {
      if (cleanKey === ptKey.toLowerCase().replace(/[\t\s]/g, '')) {
        englishKey = enKey;
        break;
      }
    }
    
    // If no mapping found, use original key (cleaned)
    if (englishKey === cleanKey) {
      // Try to find partial match
      const originalKey = key.replace(/[\t\s]/g, '');
      englishKey = originalKey;
    }
    
    // Trim string values to remove leading/trailing spaces
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    normalized[englishKey] = cleanValue;
  }
  
  // Normalize the action value
  if (normalized.action && typeof normalized.action === 'string') {
    const cleanAction = (normalized.action as string).toLowerCase().replace(/[\t\s]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mappedAction = actionMap[cleanAction];
    if (mappedAction) {
      normalized.action = mappedAction;
    }
  }
  
  // Normalize date format (convert 2025/12/02 to 2025-12-02)
  if (normalized.date && typeof normalized.date === 'string') {
    normalized.date = (normalized.date as string).replace(/\//g, '-');
  }
  
  return normalized as unknown as RequestBody;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json();
    console.log('n8n-appointments raw request:', rawBody);
    
    const body = normalizeBody(rawBody);
    console.log('n8n-appointments normalized request:', body);

    const { action, barbershop_id } = body;

    // Validar barbershop_id
    if (!barbershop_id) {
      throw new Error('barbershop_id é obrigatório');
    }

    switch (action) {
      case 'getInfo': {
        // Buscar informações da barbearia, barbeiros e serviços
        const [barbershopResult, barbersResult, servicesResult] = await Promise.all([
          supabase.from('barbershops').select('*').eq('id', barbershop_id).single(),
          supabase.from('barbers').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
          supabase.from('services').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
        ]);

        if (barbershopResult.error) throw barbershopResult.error;
        if (barbersResult.error) throw barbersResult.error;
        if (servicesResult.error) throw servicesResult.error;

        return new Response(
          JSON.stringify({
            barbershop: barbershopResult.data,
            barbers: barbersResult.data,
            services: servicesResult.data,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getAvailableTimes': {
        const { barber_id, service_id, date } = body;
        
        // service_id agora é opcional - disponibilidade é por barbeiro
        if (!barber_id || !date) {
          throw new Error('barber_id e date são obrigatórios para getAvailableTimes');
        }

        console.log(`[getAvailableTimes] Buscando horários para barbeiro ${barber_id} na data ${date}`);

        // Validar que barbeiro pertence à barbearia
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Duração padrão de 30 minutos se service_id não for fornecido
        let serviceDuration = 30;
        
        if (service_id) {
          // Validar que serviço pertence à barbearia
          const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', service_id)
            .eq('barbershop_id', barbershop_id)
            .single();

          if (serviceError || !service) {
            console.log(`[getAvailableTimes] Serviço ${service_id} não encontrado, usando duração padrão de 30 min`);
          } else {
            serviceDuration = service.duration_minutes;
          }
        }

        console.log(`[getAvailableTimes] Usando duração de ${serviceDuration} minutos`);

        // Buscar horários da barbearia
        const { data: barbershop, error: barbershopError } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time, working_days')
          .eq('id', barbershop_id)
          .single();

        if (barbershopError || !barbershop) {
          throw new Error('Barbearia não encontrada');
        }

        // Verificar se a data é um dia de trabalho
        const dateObj = new Date(date + 'T00:00:00-03:00');
        const dayOfWeek = dateObj.getDay();
        
        console.log(`[getAvailableTimes] Dia da semana: ${dayOfWeek}, Dias de trabalho: ${barbershop.working_days}`);
        
        if (!barbershop.working_days.includes(dayOfWeek)) {
          console.log(`[getAvailableTimes] Dia ${dayOfWeek} não é dia de trabalho`);
          return new Response(
            JSON.stringify({ available_times: [], message: 'Dia não é dia de trabalho' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos existentes para este barbeiro nesta data
        // IMPORTANTE: Usar timezone de Brasília (-03:00) e ignorar agendamentos cancelados
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;

        console.log(`[getAvailableTimes] Buscando agendamentos entre ${startOfDay} e ${endOfDay}`);

        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('appointment_date, service_id, status')
          .eq('barber_id', barber_id)
          .gte('appointment_date', startOfDay)
          .lte('appointment_date', endOfDay)
          .neq('status', 'cancelled'); // IGNORAR AGENDAMENTOS CANCELADOS

        if (appointmentsError) throw appointmentsError;

        console.log(`[getAvailableTimes] Agendamentos encontrados (excluindo cancelados):`, 
          existingAppointments?.map(a => ({
            date: a.appointment_date,
            status: a.status
          }))
        );

        // Buscar duração dos serviços dos agendamentos existentes
        const serviceIds = [...new Set(existingAppointments?.map(a => a.service_id) || [])];
        let serviceDurations = new Map<string, number>();
        
        if (serviceIds.length > 0) {
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

          if (servicesError) throw servicesError;

          serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);
        }

        // Gerar slots de tempo
        const [openHour, openMinute] = barbershop.opening_time.split(':').map(Number);
        const [closeHour, closeMinute] = barbershop.closing_time.split(':').map(Number);
        
        console.log(`[getAvailableTimes] Horário de funcionamento: ${openHour}:${openMinute} - ${closeHour}:${closeMinute}`);
        
        const slots: string[] = [];
        let currentHour = openHour;
        let currentMinute = openMinute;

        while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
          const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          // Criar datetime com timezone de Brasília
          const slotDateTime = new Date(`${date}T${timeString}:00-03:00`);
          
          // Verificar se este slot conflita com algum agendamento existente
          const hasConflict = existingAppointments?.some(appointment => {
            const appointmentStart = new Date(appointment.appointment_date);
            const appointmentDuration = serviceDurations.get(appointment.service_id) || 30;
            const appointmentEnd = new Date(appointmentStart.getTime() + appointmentDuration * 60000);
            const slotEnd = new Date(slotDateTime.getTime() + serviceDuration * 60000);

            // Verifica se há sobreposição
            const overlaps = slotDateTime < appointmentEnd && slotEnd > appointmentStart;
            
            if (overlaps) {
              console.log(`[getAvailableTimes] Conflito detectado: slot ${timeString} conflita com agendamento às ${appointmentStart.toISOString()}`);
            }
            
            return overlaps;
          });

          if (!hasConflict) {
            // Verificar se o slot + duração do serviço cabe antes do horário de fechamento
            const slotEndHour = Math.floor((currentHour * 60 + currentMinute + serviceDuration) / 60);
            const slotEndMinute = (currentHour * 60 + currentMinute + serviceDuration) % 60;
            
            if (slotEndHour < closeHour || (slotEndHour === closeHour && slotEndMinute <= closeMinute)) {
              slots.push(timeString);
            }
          }

          // Avançar 30 minutos
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        console.log(`[getAvailableTimes] Slots disponíveis:`, slots);

        return new Response(
          JSON.stringify({ available_times: slots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createAppointment': {
        const { barber_id, service_id, date, time, client_name, client_phone } = body;
        
        console.log('[createAppointment] Dados recebidos:', { barber_id, service_id, date, time, client_name, client_phone });
        
        if (!barber_id || !service_id || !date || !time || !client_name || !client_phone) {
          throw new Error('barber_id, service_id, date, time, client_name e client_phone são obrigatórios');
        }

        // Validar barbeiro
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Validar serviço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', service_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (serviceError || !service) {
          throw new Error('Serviço não encontrado ou não pertence a esta barbearia');
        }

        // Buscar informações da barbearia para validações
        const { data: barbershop, error: barbershopError } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time, working_days')
          .eq('id', barbershop_id)
          .single();

        if (barbershopError || !barbershop) {
          throw new Error('Barbearia não encontrada');
        }

        // VALIDAÇÃO 1: Data/horário passado
        const now = new Date();
        const appointmentDateTime = `${date}T${time}:00-03:00`;
        const appointmentStart = new Date(appointmentDateTime);
        
        if (appointmentStart < now) {
          throw new Error('Não é possível agendar em datas/horários passados');
        }

        // VALIDAÇÃO 2: Dia de trabalho
        const dateObj = new Date(date + 'T00:00:00-03:00');
        const dayOfWeek = dateObj.getDay();
        
        if (!barbershop.working_days.includes(dayOfWeek)) {
          const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          throw new Error(`Barbearia não funciona ${diasSemana[dayOfWeek]}`);
        }

        // VALIDAÇÃO 3: Horário de expediente
        const [openHour, openMinute] = barbershop.opening_time.split(':').map(Number);
        const [closeHour, closeMinute] = barbershop.closing_time.split(':').map(Number);
        const [timeHour, timeMinute] = time.split(':').map(Number);

        const timeInMinutes = timeHour * 60 + timeMinute;
        const openInMinutes = openHour * 60 + openMinute;
        const closeInMinutes = closeHour * 60 + closeMinute;
        const serviceEndInMinutes = timeInMinutes + service.duration_minutes;

        if (timeInMinutes < openInMinutes || serviceEndInMinutes > closeInMinutes) {
          throw new Error(`Horário fora do expediente (${barbershop.opening_time} - ${barbershop.closing_time})`);
        }

        // Buscar ou criar cliente
        let client_id: string;

        const { data: existingClient, error: clientSearchError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientSearchError) {
          console.error('[createAppointment] Erro ao buscar cliente:', clientSearchError);
          throw clientSearchError;
        }

        if (existingClient) {
          console.log('[createAppointment] Cliente existente encontrado:', existingClient.id);
          client_id = existingClient.id;
        } else {
          console.log('[createAppointment] Criando novo cliente...');
          // Criar novo cliente
          const { data: newClient, error: clientCreateError } = await supabase
            .from('clients')
            .insert({
              barbershop_id,
              name: client_name,
              phone: client_phone,
              total_visits: 0
            })
            .select('id')
            .single();

          if (clientCreateError) {
            console.error('[createAppointment] Erro ao criar cliente:', clientCreateError);
            throw clientCreateError;
          }
          console.log('[createAppointment] Cliente criado:', newClient.id);
          client_id = newClient.id;
        }

        // Verificar conflito de horário
        const appointmentEnd = new Date(appointmentStart.getTime() + service.duration_minutes * 60000);

        console.log(`[createAppointment] Verificando conflitos para ${appointmentDateTime}`);

        // IMPORTANTE: Usar timezone de Brasília e ignorar agendamentos cancelados
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;

        const { data: conflicts, error: conflictError } = await supabase
          .from('appointments')
          .select('id, appointment_date, service_id, status')
          .eq('barber_id', barber_id)
          .gte('appointment_date', startOfDay)
          .lte('appointment_date', endOfDay)
          .neq('status', 'cancelled'); // IGNORAR AGENDAMENTOS CANCELADOS

        if (conflictError) throw conflictError;

        console.log(`[createAppointment] Agendamentos existentes (excluindo cancelados):`, 
          conflicts?.map(c => ({
            id: c.id,
            date: c.appointment_date,
            status: c.status
          }))
        );

        // Buscar durações dos serviços dos conflitos
        if (conflicts && conflicts.length > 0) {
          const serviceIds = [...new Set(conflicts.map(c => c.service_id))];
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

          if (servicesError) throw servicesError;

          const serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);

          const hasConflict = conflicts.some(conflict => {
            const conflictStart = new Date(conflict.appointment_date);
            const conflictDuration = serviceDurations.get(conflict.service_id) || 30;
            const conflictEnd = new Date(conflictStart.getTime() + conflictDuration * 60000);

            const overlaps = appointmentStart < conflictEnd && appointmentEnd > conflictStart;
            
            if (overlaps) {
              console.log(`[createAppointment] Conflito detectado com agendamento ${conflict.id} às ${conflict.appointment_date}`);
            }
            
            return overlaps;
          });

          if (hasConflict) {
            throw new Error('Horário não disponível - já existe um agendamento neste horário');
          }
        }

        // Criar agendamento
        console.log('[createAppointment] Criando agendamento com client_id:', client_id);
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            barbershop_id,
            barber_id,
            client_id,
            service_id,
            appointment_date: appointmentDateTime,
            status: 'pending',
          })
          .select('*')
          .single();

        if (appointmentError) {
          console.error('[createAppointment] Erro ao criar agendamento:', appointmentError);
          throw appointmentError;
        }

        console.log('[createAppointment] Agendamento criado:', appointment);

        // Enviar lembrete via webhook imediatamente
        try {
          const [year, month, day] = date.split('-');
          await fetch('https://n8n-n8n.knceh1.easypanel.host/webhook/lembrete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nome: client_name,
              telefone: client_phone,
              horario: `${day}/${month}/${year} às ${time}`,
            }),
          });
          console.log('[createAppointment] Lembrete enviado com sucesso');
        } catch (webhookError) {
          console.error('[createAppointment] Erro ao enviar lembrete:', webhookError);
          // Não bloqueia o fluxo se falhar
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment,
            message: 'Agendamento criado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAppointments': {
        const { client_phone } = body;
        
        if (!client_phone) {
          throw new Error('client_phone é obrigatório para listAppointments');
        }

        // Buscar cliente pelo telefone
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientError) throw clientError;

        if (!client) {
          return new Response(
            JSON.stringify({ appointments: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos do cliente
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            barber:barbers(name),
            service:services(name, price, duration_minutes)
          `)
          .eq('client_id', client.id)
          .eq('barbershop_id', barbershop_id)
          .order('appointment_date', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        return new Response(
          JSON.stringify({ appointments: appointments || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { appointment_id } = body;
        
        if (!appointment_id) {
          throw new Error('appointment_id é obrigatório para cancelAppointment');
        }

        // Verificar se o agendamento existe e pertence à barbearia
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointment_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (appointmentError || !appointment) {
          throw new Error('Agendamento não encontrado');
        }

        // Atualizar status para cancelled
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment_id);

        if (updateError) throw updateError;

        console.log('[cancelAppointment] Agendamento cancelado:', appointment_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agendamento cancelado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Ação não reconhecida: ${action || 'indefinida'}`);
    }
  } catch (error) {
    console.error('n8n-appointments error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Solicitação inválida - verifique seus parâmetros.',
        details: errorMessage 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
