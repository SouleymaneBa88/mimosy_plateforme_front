import { describe, expect, it } from 'vitest'

import {
  erreurConfirmationEmail,
  erreurConfirmationMotDePasse,
  erreurEmail,
  erreurMotDePasse,
  erreurNom,
  erreurRole,
  erreurTelephone,
  extraireErreursApi,
  formaterTelephone,
  normaliserEmail,
  normaliserNom,
  normaliserTelephone,
} from './validation'

describe('e-mail', () => {
  it('refuse un e-mail vide', () => {
    expect(erreurEmail('')).toBe("L'adresse e-mail est obligatoire.")
    expect(erreurEmail('   ')).toBe("L'adresse e-mail est obligatoire.")
  })

  it('refuse un format invalide', () => {
    for (const email of ['abc', 'test@', 'test@com', 'amadou', '@gmail.com', 'ama dou@gmail.com']) {
      expect(erreurEmail(email), email).toBe('Veuillez saisir une adresse e-mail valide.')
    }
  })

  it('refuse un e-mail trop long', () => {
    expect(erreurEmail(`${'a'.repeat(250)}@x.sn`)).toMatch(/trop longue/)
  })

  it('accepte un e-mail valide et retire seulement les espaces de bord', () => {
    expect(erreurEmail('  amadou@gmail.com  ')).toBe('')
    expect(normaliserEmail('  Amadou@Gmail.com  ')).toBe('Amadou@Gmail.com')
  })

  it('compare deux e-mails sans tenir compte de la casse', () => {
    expect(erreurConfirmationEmail('amadou@gmail.com', 'Amadou@gmail.com ')).toBe('')
    expect(erreurConfirmationEmail('amadou@gmail.com', 'awa@gmail.com')).toBe(
      'Les deux adresses e-mail ne correspondent pas.',
    )
  })
})

describe('mot de passe', () => {
  it('refuse un mot de passe vide', () => {
    expect(erreurMotDePasse('')).toBe('Le mot de passe est obligatoire.')
  })

  it('refuse un mot de passe trop court ou incomplet', () => {
    expect(erreurMotDePasse('abc123')).toMatch(/au moins 8 caractères/)
    expect(erreurMotDePasse('motdepasse')).toMatch(/au moins un chiffre/)
    expect(erreurMotDePasse('12345678')).toMatch(/au moins une lettre/)
    expect(erreurMotDePasse(' motdepasse1')).toMatch(/espace/)
    expect(erreurMotDePasse('a1'.repeat(65))).toMatch(/dépasser 128/)
  })

  it('accepte 8 caractères ou plus, caractères spéciaux compris', () => {
    expect(erreurMotDePasse('motdepasse123')).toBe('')
    expect(erreurMotDePasse('Dakar#2026!')).toBe('')
  })

  it('détecte des mots de passe différents', () => {
    expect(erreurConfirmationMotDePasse('motdepasse123', 'motdepasse124')).toBe(
      'Les deux mots de passe ne correspondent pas.',
    )
    expect(erreurConfirmationMotDePasse('motdepasse123', '')).toBe('Veuillez confirmer le mot de passe.')
    expect(erreurConfirmationMotDePasse('motdepasse123', 'motdepasse123')).toBe('')
  })
})

describe('nom et prénom', () => {
  it('refuse les noms invalides', () => {
    for (const nom of ['', 'A', 'Awa2', 'Awa@', 'Aaaa', 'x'.repeat(51), '-Awa', '<script>']) {
      expect(erreurNom(nom, 'Le nom'), nom).not.toBe('')
    }
  })

  it("n'empêche pas des noms réels", () => {
    for (const nom of ['Ndèye Fatou', "N'Diaye", 'N’Diaye', 'Mame-Diarra', 'Sy', 'Ñdoye', 'Zoë']) {
      expect(erreurNom(nom, 'Le nom'), nom).toBe('')
    }
  })

  it('normalise espaces et apostrophe typographique', () => {
    expect(normaliserNom('  Awa   Marie ')).toBe('Awa Marie')
    expect(normaliserNom('N’Diaye')).toBe("N'Diaye")
  })
})

describe('téléphone', () => {
  it('refuse les numéros invalides', () => {
    expect(erreurTelephone('')).toBe('Le numéro de téléphone est obligatoire.')
    expect(erreurTelephone('77 123 45 6')).toMatch(/9 chiffres/)
    expect(erreurTelephone('74 123 45 67')).toMatch(/mobile sénégalais/)
    expect(erreurTelephone('77 123 45 6a')).toMatch(/que des chiffres/)
  })

  it("accepte les formats utilisés, avec ou sans l'indicatif", () => {
    expect(erreurTelephone('77 123 45 67')).toBe('')
    expect(erreurTelephone('+221 77 123 45 67')).toBe('')
    expect(normaliserTelephone('+221 77 123 45 67')).toBe('771234567')
    expect(normaliserTelephone('00221771234567')).toBe('771234567')
    expect(formaterTelephone('+221771234567')).toBe('77 123 45 67')
  })
})

describe('rôle', () => {
  it('accepte uniquement CLIENT et PRESTATAIRE', () => {
    expect(erreurRole('CLIENT')).toBe('')
    expect(erreurRole('PRESTATAIRE')).toBe('')
    expect(erreurRole('ADMIN')).not.toBe('')
    expect(erreurRole('')).not.toBe('')
  })
})

describe('erreurs API (DRF)', () => {
  it('associe chaque message à son champ', () => {
    expect(extraireErreursApi({ email: ['Cette adresse e-mail est déjà utilisée.'] })).toEqual({
      champs: { email: 'Cette adresse e-mail est déjà utilisée.' },
      general: '',
    })
  })

  it('remonte detail / non_field_errors en message général, sans le code', () => {
    expect(extraireErreursApi({ code: 'token_expire', detail: 'Lien expiré.' })).toEqual({
      champs: {},
      general: 'Lien expiré.',
    })
  })

  it("n'affiche jamais un simple « 400 Bad Request »", () => {
    expect(extraireErreursApi(null, 'Message par défaut').general).toBe('Message par défaut')
  })
})
