import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('token'); // Asegúrate de que esta sea la misma clave

    if (token) {
        // También leer client_id si existe y añadir x-client-id
        const clientId = localStorage.getItem('client_id');
        const headers: { [k: string]: string } = {
            Authorization: `Bearer ${token}`
        };

        if (clientId) {
            headers['x-client-id'] = clientId;
        }

        const cloned = req.clone({
            setHeaders: headers,
            withCredentials: false // o true si usás cookies, JWT normalmente es false
        });

        console.log('✅ Interceptor: token agregado al header', headers);
        return next(cloned);
    }

    console.warn('⚠️ Interceptor: no se encontró token en localStorage');
    return next(req);
};
