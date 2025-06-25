
create or replace function create_booking(
    p_business_id uuid,
    p_service_id uuid,
    p_staff_id uuid,
    p_slot text,
    p_date text,
    p_client_name text,
    p_client_email text,
    p_client_phone text
) returns uuid as $$
declare
    v_client_id uuid;
    v_appointment_id uuid;
    v_slot_id uuid;
begin
    -- Check if the slot is available
    select id into v_slot_id
    from slot
    where business_id = p_business_id
      and staff_id = p_staff_id
      and date = p_date::date
      and start_time = p_slot::time
      and is_booked = false
    for update;

    if v_slot_id is null then
        raise exception 'Slot not available';
    end if;

    -- Find or create client
    select id into v_client_id
    from client
    where email = p_client_email;

    if v_client_id is null then
        insert into client (name, email, phone, business_id)
        values (p_client_name, p_client_email, p_client_phone, p_business_id)
        returning id into v_client_id;
    end if;

    -- Create appointment
    insert into appointment (business_id, client_id, staff_id, service_id, date, start_time, price, status)
    values (p_business_id, v_client_id, p_staff_id, p_service_id, p_date::date, p_slot::time, 0, 'confirmed')
    returning id into v_appointment_id;

    -- Update slot
    update slot
    set is_booked = true
    where id = v_slot_id;

    return v_appointment_id;
end;
$$ language plpgsql;
