import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import './globals.css'
 
export const metadata = {
  title: {
    default: 'UniPay',
    template: '%s – UniPay'
  },
  description: 'Unified payment gateway abstraction for Node.js'
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