import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  tags?: string[]
}

export interface DispatchReport {
  signal: AlertSignal
  emailSent: boolean
  logged: boolean
  timestamp: string
  error?: string
}

export class ElarisAlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal): Promise<boolean> {
    if (!this.cfg.email) return false
    try {
      const { host, port, user, pass, from, to, secure } = this.cfg.email
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure ?? false,
        auth: { user, pass },
      })
      await transporter.sendMail({
        from,
        to,
        subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
        text: signal.message,
      })
      return true
    } catch (err: any) {
      console.error(`[ElarisAlert][EMAIL] Failed: ${err.message}`)
      return false
    }
  }

  private logConsole(signal: AlertSignal): boolean {
    if (!this.cfg.console) return false
    const ts = new Date().toISOString()
    console.log(
      `[ElarisAlert][${signal.level.toUpperCase()}][${ts}] ${signal.title}\n${signal.message}`
    )
    if (signal.tags?.length) {
      console.log(`Tags: ${signal.tags.join(", ")}`)
    }
    return true
  }

  async dispatch(signals: AlertSignal[]): Promise<DispatchReport[]> {
    const reports: DispatchReport[] = []
    for (const sig of signals) {
      const ts = new Date().toISOString()
      let error: string | undefined = undefined
      const emailSent = await this.sendEmail(sig)
      const logged = this.logConsole(sig)
      if (!emailSent && this.cfg.email) {
        error = "Email delivery failed"
      }
      reports.push({
        signal: sig,
        emailSent,
        logged,
        timestamp: ts,
        error,
      })
    }
    return reports
  }
}
