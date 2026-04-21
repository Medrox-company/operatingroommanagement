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
  // Light theme colors
  const primaryColor = '#4A5D8C';
  const primaryColorLight = '#5A6FA0';
  const lightBg = '#EAEEF3';
  const cardBg = '#ffffff';
  const textPrimary = '#1a1a2e';
  const textSecondary = '#5a6478';
  const textMuted = '#8a94a6';

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
        backgroundColor: lightBg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        {/* Main Container */}
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{
            width: '100%',
            backgroundColor: lightBg,
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
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <tbody>
                    {/* Top Accent Bar */}
                    <tr>
                      <td style={{
                        height: '5px',
                        backgroundColor: primaryColor,
                      }} />
                    </tr>

                    {/* Logo Section */}
                    <tr>
                      <td style={{ padding: '48px 40px 32px', textAlign: 'center' }}>
                        <img
                          src="https://operatingroommanagement.vercel.app/logo.png"
                          alt="Operating Room Manager"
                          width="120"
                          height="120"
                          style={{
                            display: 'block',
                            margin: '0 auto',
                          }}
                        />
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
                            fontSize: '15px',
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
                        padding: '16px 40px 24px',
                        textAlign: 'center',
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '15px',
                          lineHeight: 1.7,
                          color: textSecondary,
                        }}>
                          {message}
                        </p>
                      </td>
                    </tr>

                    {/* Link/URL if no CTA button */}
                    {ctaUrl && !ctaText && (
                      <tr>
                        <td style={{ 
                          padding: '0 40px 24px',
                          textAlign: 'center',
                        }}>
                          <a
                            href={ctaUrl}
                            style={{
                              color: primaryColor,
                              textDecoration: 'none',
                              fontSize: '14px',
                            }}
                          >
                            {ctaUrl}
                          </a>
                        </td>
                      </tr>
                    )}

                    {/* Section Heading */}
                    <tr>
                      <td style={{ 
                        padding: '8px 40px 16px',
                        textAlign: 'center',
                      }}>
                        <h2 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 700,
                          color: textPrimary,
                          lineHeight: 1.4,
                        }}>
                          {heading}
                        </h2>
                      </td>
                    </tr>

                    {/* Additional Info */}
                    <tr>
                      <td style={{ 
                        padding: '0 40px 32px',
                        textAlign: 'center',
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          lineHeight: 1.6,
                          color: textMuted,
                        }}>
                          Prosím zkontrolujte aktuální stav v systému Operating Room Manager.
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
                              padding: '14px 36px',
                              backgroundColor: primaryColor,
                              color: '#ffffff',
                              textDecoration: 'none',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '14px',
                            }}
                          >
                            {ctaText}
                          </a>
                        </td>
                      </tr>
                    )}

                    {/* Footer */}
                    <tr>
                      <td style={{ 
                        padding: '24px 40px',
                        textAlign: 'center',
                        borderTop: '1px solid #eaeef3',
                      }}>
                        <p style={{
                          margin: '0 0 4px',
                          fontSize: '13px',
                          color: textMuted,
                        }}>
                          Děkujeme
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: textSecondary,
                          fontWeight: 500,
                        }}>
                          {footerText}
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
                          color: textMuted,
                        }}>
                          {'Máte dotazy? Kontaktujte nás na '}
                          <a
                            href="mailto:podpora@nemocnice.cz"
                            style={{ color: primaryColor, textDecoration: 'none' }}
                          >
                            Email
                          </a>
                          {' nebo navštivte naši '}
                          <a
                            href="#"
                            style={{ color: primaryColor, textDecoration: 'none' }}
                          >
                            Nápovědu
                          </a>
                          {'.'}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Copyright */}
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: '600px',
                    margin: '16px auto 0',
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#b0b8c4',
                        }}>
                          {`© ${new Date().getFullYear()} Operating Room Manager. Všechna práva vyhrazena.`}
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
    heading="Co je potřeba udělat"
    recipientName="koordinátore"
    message={`Operatér ${operatorName} má zpoždění v sálu ${roomName}. Plánovaný čas příchodu byl ${scheduledTime}. Prosím zkontrolujte aktuální stav a případně upravte rozvrh.`}
    ctaText="Pozdní příchod operatéra"
    ctaUrl={ctaUrl}
    footerText="Operating Room Manager"
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
    heading="Co je potřeba udělat"
    recipientName={recipientName}
    message={changeDescription}
    ctaText="Zobrazit rozvrh"
    ctaUrl={ctaUrl}
    footerText="Operating Room Manager"
  />
);

export const WelcomeEmailTemplate: React.FC<{
  recipientName: string;
  loginUrl?: string;
}> = ({ recipientName, loginUrl = '#' }) => (
  <EmailTemplate
    title="Vítejte v Operating Room Manager"
    preheader="Váš účet byl úspěšně vytvořen"
    heading="Co je potřeba udělat"
    recipientName={recipientName}
    message="Váš účet byl úspěšně vytvořen a je připraven k použití. Můžete se přihlásit pomocí svých přihlašovacích údajů a začít spravovat operační sály."
    ctaText="Přihlásit se"
    ctaUrl={loginUrl}
    footerText="Operating Room Manager"
  />
);

export default EmailTemplate;
