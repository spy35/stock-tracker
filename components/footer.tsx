import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Section */}
          <div>
            <h3 className="font-bold text-lg mb-4">COMPANY</h3>
            <h4 className="font-semibold text-xl mb-2">STOCK MASTER</h4>
            <p className="text-muted-foreground mb-4">Providing the best stock investment information and analysis.</p>
            <p className="text-sm text-muted-foreground">© 2025 Stock Master</p>
          </div>

          {/* Useful Links Section */}
          <div>
            <h3 className="font-bold text-lg mb-4">USEFUL LINKS</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-muted-foreground hover:text-primary transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-muted-foreground hover:text-primary transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-bold text-lg mb-4">CONTACT</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>CEO Lee Hojun</p>
              <p>(02) 1234-5678</p>
              <p>stocking@money.com</p>
              <p>Seoul, Republic of Korea</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
