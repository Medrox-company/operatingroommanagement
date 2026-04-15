import React from 'react';

interface EmailTemplateProps {
  title?: string;
  preheader?: string;
  heading?: string;
  message?: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
  recipientName?: string;
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  title = 'Operating Room Manager',
  preheader = '',
  heading = 'Oznámení',
  message = '',
  ctaText,
  ctaUrl,
  footerText = 'Operating Room Manager',
  recipientName,
}) => {
  const primaryColor = '#00D8C1';
  const darkBg = '#0a0a0f';
  const cardBg = '#141419';
  const textPrimary = '#ffffff';
  const textSecondary = '#9ca3af';
  const borderColor = '#1f1f28';

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {preheader && (
          <span style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
            {preheader}
          </span>
        )}
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: darkBg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        {/* Main Container */}
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{
            width: '100%',
            backgroundColor: darkBg,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '40px 20px' }}>
                {/* Email Card */}
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    backgroundColor: cardBg,
                    borderRadius: '24px',
                    border: `1px solid ${borderColor}`,
                    overflow: 'hidden',
                  }}
                >
                  <tbody>
                    {/* Top Accent Bar */}
                    <tr>
                      <td style={{
                        height: '4px',
                        background: `linear-gradient(90deg, ${primaryColor} 0%, #00A896 100%)`,
                      }} />
                    </tr>

                    {/* Logo Section */}
                    <tr>
                      <td style={{ padding: '40px 40px 24px', textAlign: 'center' }}>
                        <img
                          src="https://operatingroommanagement.vercel.app/logo.png"
                          alt="Operating Room Manager"
                          width="80"
                          height="80"
                          style={{
                            display: 'block',
                            margin: '0 auto',
                            filter: 'drop-shadow(0 0 20px rgba(0,216,193,0.3))',
                          }}
                        />
                      </td>
                    </tr>

                    {/* Heading */}
                    <tr>
                      <td style={{ 
                        padding: '0 40px 16px',
                        textAlign: 'center',
                      }}>
                        <h1 style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          color: textPrimary,
                          lineHeight: 1.4,
                        }}>
                          {heading}
                        </h1>
                      </td>
                    </tr>

                    {/* Greeting */}
                    {recipientName && (
                      <tr>
                        <td style={{ 
                          padding: '0 40px 8px',
                          textAlign: 'center',
                        }}>
                          <p style={{
                            margin: 0,
                            fontSize: '16px',
                            color: textSecondary,
                          }}>
                            {`Dobrý den, ${recipientName}`}
                          </p>
                        </td>
                      </tr>
                    )}

                    {/* Main Message */}
                    <tr>
                      <td style={{ 
                        padding: '16px 40px 32px',
                        textAlign: 'center',
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '16px',
                          lineHeight: 1.7,
                          color: textSecondary,
                        }}>
                          {message}
                        </p>
                      </td>
                    </tr>

                    {/* CTA Button */}
                    {ctaText && ctaUrl && (
                      <tr>
                        <td style={{ 
                          padding: '0 40px 40px',
                          textAlign: 'center',
                        }}>
                          <a
                            href={ctaUrl}
                            style={{
                              display: 'inline-block',
                              padding: '16px 40px',
                              backgroundColor: primaryColor,
                              color: '#0a0a0f',
                              textDecoration: 'none',
                              borderRadius: '12px',
                              fontWeight: 600,
                              fontSize: '15px',
                              boxShadow: '0 4px 24px rgba(0,216,193,0.3)',
                            }}
                          >
                            {ctaText}
                          </a>
                        </td>
                      </tr>
                    )}

                    {/* Divider */}
                    <tr>
                      <td style={{ padding: '0 40px' }}>
                        <div style={{
                          height: '1px',
                          backgroundColor: borderColor,
                        }} />
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ 
                        padding: '24px 40px 32px',
                        textAlign: 'center',
                      }}>
                        <p style={{
                          margin: '0 0 8px',
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          {footerText}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.2)',
                        }}>
                          {`© ${new Date().getFullYear()} Operating Room Manager. Všechna práva vyhrazena.`}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Help Link */}
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: '600px',
                    margin: '24px auto 0',
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          {'Máte dotazy? '}
                          <a
                            href="mailto:podpora@nemocnice.cz"
                            style={{ color: primaryColor, textDecoration: 'none' }}
                          >
                            Kontaktujte nás
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
};

// Pre-defined email templates for common notifications
export const LateArrivalEmailTemplate: React.FC<{
  operatorName: string;
  roomName: string;
  scheduledTime: string;
  ctaUrl?: string;
}> = ({ operatorName, roomName, scheduledTime, ctaUrl = '#' }) => (
  <EmailTemplate
    title="Pozdní příchod operatéra"
    preheader={`Upozornění: ${operatorName} má zpoždění`}
    heading="Upozornění na zpoždění"
    recipientName="koordinátore"
    message={`Operatér ${operatorName} má zpoždění v sálu ${roomName}. Plánovaný čas příchodu byl ${scheduledTime}. Prosím zkontrolujte aktuální stav a případně upravte rozvrh.`}
    ctaText="Zobrazit rozvrh"
    ctaUrl={ctaUrl}
    footerText="Toto je automatická notifikace systému Operating Room Manager"
  />
);

export const ScheduleChangeEmailTemplate: React.FC<{
  recipientName: string;
  changeDescription: string;
  ctaUrl?: string;
}> = ({ recipientName, changeDescription, ctaUrl = '#' }) => (
  <EmailTemplate
    title="Změna v rozvrhu"
    preheader="Byl upraven rozvrh operačních sálů"
    heading="Změna v rozvrhu"
    recipientName={recipientName}
    message={changeDescription}
    ctaText="Zobrazit rozvrh"
    ctaUrl={ctaUrl}
    footerText="Toto je automatická notifikace systému Operating Room Manager"
  />
);

export const WelcomeEmailTemplate: React.FC<{
  recipientName: string;
  loginUrl?: string;
}> = ({ recipientName, loginUrl = '#' }) => (
  <EmailTemplate
    title="Vítejte v Operating Room Manager"
    preheader="Váš účet byl úspěšně vytvořen"
    heading="Vítejte v systému"
    recipientName={recipientName}
    message="Váš účet byl úspěšně vytvořen a je připraven k použití. Můžete se přihlásit pomocí svých přihlašovacích údajů a začít spravovat operační sály."
    ctaText="Přihlásit se"
    ctaUrl={loginUrl}
    footerText="Děkujeme, že používáte Operating Room Manager"
  />
);

export default EmailTemplate;
