# Resend Integration - Příklady Použití

## Příklad 1: Základní Test Email

V komponentě NotificationsManager je vestavěný test rozhraní:

```
1. Klikněte na tlačítko "Testovat email" v Nastavení → Notifikace
2. Zadejte vaši email adresu
3. Klikněte "Poslat test"
```

## Příklad 2: Odesílání Notifikace ze Specifických Akcí

### Emergency Alert Email

```typescript
import { sendEmailNotification, generateEmailTemplate } from './lib/email';

// Když je aktivován nouzový stav
const handleEmergency = async (roomId: string, roomName: string) => {
  const html = generateEmailTemplate({
    type: 'emergency_alert',
    roomName: roomName,
    message: 'Emergency alert has been activated',
    details: {
      'Room ID': roomId,
      'Time': new Date().toLocaleString('cs-CZ'),
      'Action': 'Immediate attention required'
    }
  });

  const result = await sendEmailNotification({
    to: 'manager@hospital.cz',
    subject: `EMERGENCY: ${roomName}`,
    html
  });

  if (result.success) {
    console.log('Emergency notification sent');
  }
};
```

### Status Change Notification

```typescript
// Když se změní stav sálu
const handleStatusChange = async (room: OperatingRoom, oldStatus: string) => {
  const html = generateEmailTemplate({
    type: 'status_change',
    roomName: room.name,
    message: `Status changed from ${oldStatus} to ${room.status}`,
    details: {
      'Department': room.department,
      'Previous Status': oldStatus,
      'New Status': room.status,
      'Queue': room.queueCount.toString()
    }
  });

  await sendEmailNotification({
    to: 'staff@hospital.cz',
    subject: `${room.name}: ${oldStatus} → ${room.status}`,
    html
  });
};
```

## Příklad 3: Automatické Notifikace (Hook)

Importujte hook `useEmailNotifications` v hlavní komponentě:

```typescript
import { useEmailNotifications } from './hooks/useEmailNotifications';

function AppContent() {
  const { rooms } = useAuth();
  
  // Automatické odesílání notifikací
  useEmailNotifications(rooms, {
    emergencyEnabled: true,
    statusChangeEnabled: true,
    queueUpdateEnabled: true,
    recipientEmail: 'manager@hospital.cz'
  });
  
  return <div>{/* ... */}</div>;
}
```

## Příklad 4: Hromadné Odesílání

```typescript
import { sendBatchEmailNotifications } from './lib/email';

const sendMaintenanceNotice = async () => {
  const recipients = [
    'doctor1@hospital.cz',
    'doctor2@hospital.cz',
    'nurse1@hospital.cz'
  ];

  const result = await sendBatchEmailNotifications(recipients, {
    type: 'maintenance',
    roomName: 'All Operating Rooms',
    message: 'System maintenance scheduled for tonight at 22:00',
    details: {
      'Start Time': '22:00',
      'End Time': '23:00',
      'Impact': 'System will be offline',
      'Date': '2024-03-24'
    }
  });

  console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
};
```

## Příklad 5: Vlastní Emailová Šablona

```typescript
import { sendEmailNotification } from './lib/email';

const sendCustomEmail = async (userEmail: string) => {
  const customHtml = `
    <html>
      <body style="font-family: Arial; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
          <h1>Custom Notification</h1>
          <p>This is a custom email notification.</p>
          <p>Room status: ACTIVE</p>
        </div>
      </body>
    </html>
  `;

  await sendEmailNotification({
    to: userEmail,
    subject: 'Custom Operating Room Notification',
    html: customHtml
  });
};
```

## Příklad 6: Error Handling

```typescript
import { sendEmailNotification } from './lib/email';

const sendWithErrorHandling = async () => {
  const result = await sendEmailNotification({
    to: 'user@hospital.cz',
    subject: 'Test',
    html: '<h1>Test</h1>'
  });

  if (result.success) {
    console.log('Email sent:', result.messageId);
  } else {
    console.error('Failed to send email:', result.error);
    // Show error to user
    showErrorNotification(result.error);
  }
};
```

## Typy Notifikací

### 1. Emergency Alert
```typescript
{
  type: 'emergency_alert',
  roomName: 'OR 1',
  message: 'Emergency activated',
  details: { /* ... */ }
}
```

### 2. Status Change
```typescript
{
  type: 'status_change',
  roomName: 'OR 1',
  message: 'Status changed to OCCUPIED',
  details: { /* ... */ }
}
```

### 3. Queue Update
```typescript
{
  type: 'queue_update',
  roomName: 'OR 1',
  message: 'Queue updated',
  details: { /* ... */ }
}
```

### 4. Maintenance
```typescript
{
  type: 'maintenance',
  roomName: 'System',
  message: 'Maintenance scheduled',
  details: { /* ... */ }
}
```

### 5. Custom
```typescript
{
  type: 'custom',
  roomName: 'Room Name',
  message: 'Custom message',
  details: { /* ... */ }
}
```

## Konfigurace Resend

### Pro Vývoj

Používejte default doménu: `onboarding@resend.dev`

### Pro Produkci

1. Přihlaste se na https://resend.com
2. Nakonfigurujte vlastní doménu
3. Aktualizujte `from` adresu v `lib/email.ts`:

```typescript
from: 'noreply@yourdomain.com', // Vaše doména
```

## Best Practices

1. **Throttling** - Neposílejte příliš mnoho emailů najednou
   ```typescript
   // Systém automaticky čeká 100ms mezi jednotlivými odesláními
   ```

2. **Validace Emailu** - Vždy ověřte validitu emailové adresy
   ```typescript
   const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   ```

3. **Rate Limiting** - Limitujte odesílání na stejný email
   ```typescript
   // useEmailNotifications automaticky throttluje emergency emaily
   // max 1 za 5 minut na sál
   ```

4. **Unsubscribe Option** - Přidejte možnost odhlášení
   ```typescript
   // Přidejte unsubscribe link v emailu
   ```

5. **Testing** - Vždy testujte s vlastním emailem před nasazením
   ```typescript
   // Použijte test rozhraní v Nastavení → Notifikace
   ```

## Troubleshooting

### Email se neposílá
- Zkontrolujte VITE_RESEND_API_KEY v .env.local
- Ověřte, že je email adresa validní
- Zkontrolujte konzoli pro chyby

### Resend API error
- Zkontrolujte API klíč na https://resend.com/api-keys
- Ověřte, že má klíč správná práva
- Ujistěte se, že je klíč aktuální

### Rate limiting
- Resend má limit ~100 emailů za sekundu
- Hook useEmailNotifications automaticky čeká mezi odesláními
- Pro hromadné odesílání používejte sendBatchEmailNotifications

## Monitorování

Zkontrolujte odesílání emailů v Resend dashboardu:
- https://resend.com/emails
- Vidíte zde status každého odeslaného emailu
- Loguje se kdo, kdy a jaký email obdržel

## Databázové Logování (Volitelné)

Pro produkci byste měli logovat odesílání emailů:

```typescript
// Přidejte do sendEmailNotification
export async function recordEmailNotification(
  roomId: string,
  recipient: string,
  type: string,
  status: 'sent' | 'failed'
) {
  // Logujte do supabase nebo vaší databáze
  await supabase
    .from('email_notifications')
    .insert({
      room_id: roomId,
      recipient,
      type,
      status,
      created_at: new Date().toISOString()
    });
}
```
