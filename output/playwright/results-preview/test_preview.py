from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

out = Path(__file__).parent
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1600}, timezone_id='America/Argentina/Buenos_Aires')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    def open_scenario(scenario):
        page.goto('http://127.0.0.1:3017/?scenario=' + scenario)
        page.wait_for_load_state('networkidle')
        page.get_by_role('button', name='Cargar mes', exact=True).click()
    open_scenario('recent')
    expect(page.get_by_role('heading', name='Mes enviado', exact=True)).to_be_visible()
    expect(page.get_by_role('spinbutton', name='Ingresos totales del mes $', exact=True)).to_have_attribute('readonly', '')
    expect(page.get_by_role('button', name='Guardar cambios', exact=True)).to_have_count(0)
    page.screenshot(path=str(out / '00-mes-enviado-solo-lectura.png'), full_page=True)
    page.get_by_role('button', name='Editar', exact=True).click()
    expect(page.get_by_role('spinbutton', name='Ingresos totales del mes $', exact=True)).to_be_editable()
    expect(page.get_by_role('button', name='Guardar cambios', exact=True)).to_be_visible()
    expect(page.get_by_text('Pod\u00e9s editarlo hasta el', exact=False)).to_be_visible()
    revenue = page.locator('label').filter(has=page.get_by_text('Ingresos totales del mes', exact=True)).locator('input')
    revenue.fill('1600000')
    page.screenshot(path=str(out / '01-editar-mes-reciente.png'), full_page=True)
    page.get_by_role('button', name='Guardar cambios', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Cambios guardados')
    requests = page.evaluate('window.previewRequests')
    assert len(requests) == 1 and requests[0]['method'] == 'PUT', requests
    assert json.loads(requests[0]['body'])['values'][0]['originalAmount'] == 1600000
    checks.append('Mes enviado hace 3 días: permite corregir y envía el nuevo valor sin reenviar ni reiniciar el plazo.')
    page.screenshot(path=str(out / '02-cambios-guardados.png'), full_page=True)

    open_scenario('expired')
    expect(page.get_by_role('button', name='Guardar cambios', exact=True)).to_have_count(0)
    expect(page.get_by_text('El plazo de edici\u00f3n finaliz\u00f3. Pod\u00e9s consultar tus resultados.', exact=True)).to_be_visible()
    expect(page.get_by_role('spinbutton', name='Ingresos totales del mes $', exact=True)).to_have_attribute('readonly', '')
    page.screenshot(path=str(out / '03-plazo-vencido.png'), full_page=True)
    expect(page.get_by_role('button', name='Editar', exact=True)).to_have_count(0)
    assert page.evaluate('window.previewRequests.length') == 0
    checks.append('Plazo vencido: muestra bloqueo y no ofrece guardar ni enviar.')

    open_scenario('new')
    expect(page.get_by_text('Una vez enviado, ten\u00e9s 15 d\u00edas para editarlo.', exact=True)).to_be_visible()
    page.screenshot(path=str(out / '04-aviso-antes-de-enviar.png'), full_page=True)
    page.get_by_role('button', name='Enviar mes', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Tenés 15 días desde este envío')
    assert [x['method'] for x in page.evaluate('window.previewRequests')] == ['POST', 'PUT', 'POST']
    page.screenshot(path=str(out / '05-mes-enviado.png'), full_page=True)
    checks.append('Nuevo envío: aviso antes y después, creación + guardado + envío correctos.')

    open_scenario('new')
    page.get_by_role('button', name='Guardar borrador', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Borrador guardado')
    assert not any(x['url'].endswith('/submit') for x in page.evaluate('window.previewRequests'))
    checks.append('Borrador: guarda sin enviar y avisa que el plazo comienza al enviar.')

    open_scenario('recent')
    page.get_by_role('button', name='Editar', exact=True).click()
    page.evaluate('window.rejectSave = true')
    page.get_by_role('button', name='Guardar cambios', exact=True).click()
    expect(page.get_by_text('El plazo de 15 días para editar este mes ya terminó.', exact=True)).to_be_visible()
    expect(page.get_by_role('status')).to_have_count(0)
    checks.append('Servidor rechaza por vencimiento: muestra error, conserva formulario y no confirma éxito.')

    page.set_viewport_size({'width': 390, 'height': 844})
    open_scenario('recent')
    expect(page.get_by_role('button', name='Editar', exact=True)).to_be_visible()
    page.screenshot(path=str(out / '06-edicion-movil.png'), full_page=False)
    page.get_by_role('button', name='Editar', exact=True).click()
    page.get_by_role('button', name='Cerrar', exact=True).click()
    page.get_by_role('button', name='Cargar mes', exact=True).click()
    expect(page.get_by_role('spinbutton', name='Ingresos totales del mes $', exact=True)).to_have_attribute('readonly', '')
    checks.append('Al reabrir un mes enviado vuelve a consulta; Editar habilita los campos.')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    checks.append('Pantalla móvil: sin desbordamiento horizontal.')
    assert not errors, errors
    checks.append('Sin errores JavaScript durante los recorridos.')
    browser.close()
    (out / 'test-results.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(checks, ensure_ascii=False, indent=2))

