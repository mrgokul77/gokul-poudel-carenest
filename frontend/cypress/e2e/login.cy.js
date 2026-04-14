describe('Login Feature', () => {

  beforeEach(() => {
    cy.visit('https://www.carenestapp.me/login')
  })

  it('TC007 - Login with valid credentials', () => {
    cy.get('input[type="email"]').type('gokulpoudel558@gmail.com')
    cy.get('input[type="password"]').type('12345678')
    cy.contains('button', 'Log In').click()
    cy.url().should('include', '/caregiver/dashboard')
  })

  it('TC008 - Login with invalid credentials', () => {
    cy.get('input[type="email"]').type('wrong@gmail.com')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.contains('button', 'Log In').click()
    cy.get('input[type="email"]').should('be.visible')
  })

  it('TC - Empty form submission', () => {
    cy.contains('button', 'Log In').click()
    cy.get('input[type="email"]').then(($input) => {
      expect($input[0].validationMessage).to.not.be.empty
    })
  })

})