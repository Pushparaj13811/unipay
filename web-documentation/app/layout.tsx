import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import './globals.css'
 
export const metadata = {
  title: {
    default: 'UniPay - Unified Payment Gateway for Node.js',
    template: '%s – UniPay'
  },
  description: 'UniPay provides a unified payment gateway abstraction for Node.js. Seamlessly integrate Stripe, PayPal, Razorpay, and more with one elegant API.',
  metadataBase: new URL('https://unipay.hpm.com.np'),
  openGraph: {
    title: 'UniPay - Unified Payment Gateway for Node.js',
    description: 'UniPay provides a unified payment gateway abstraction for Node.js. Seamlessly integrate Stripe, PayPal, Razorpay, and more with one elegant API.',
    url: 'https://unipay.hpm.com.np',
    siteName: 'UniPay',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'UniPay - Unified Payment Gateway Abstraction for Node.js'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UniPay - Unified Payment Gateway for Node.js',
    description: 'UniPay provides a unified payment gateway abstraction for Node.js. Seamlessly integrate Stripe, PayPal, Razorpay, and more with one elegant API.',
    images: ['/og-image.svg']
  }
}

const navbar = (
  <Navbar
    logo={<strong>UniPay</strong>}
    projectLink="https://github.com/Pushparaj13811/unipay"
  />
)
const footer = <Footer>UniPay Documentation - MIT License</Footer>
 
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/Pushparaj13811/unipay/tree/main/web-documentation"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}