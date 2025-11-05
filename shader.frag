#version 330 core

// uniform vec3 color;
uniform vec3 position;
uniform vec3 lookat;
uniform vec3 up;
uniform float time;

uniform sampler2D starfield;

in vec3 color;

layout (location = 0) out vec4 out_color;

const float T0 = 2.5e5;   // base temperature at inner radius (Kelvin)
const float Rin = 0.01;    // inner radius (scale so Rin = 1)
const float b = 2.897e-3; // Wien's constant (m*K)

// Convert wavelength (nm) to approximate RGB (linear space)
vec3 wavelengthToRGB(float wavelength) {
    float r = 0.0;
    float g = 0.0;
    float b = 0.0;
    float s = 0.0; // Intensity/saturation factor

    // Adjust wavelength for perceived intensity (optional, but often desired)
    if (wavelength >= 380.0 && wavelength < 440.0) {
        r = -(wavelength - 440.0) / (440.0 - 380.0);
        b = 1.0;
    } else if (wavelength >= 440.0 && wavelength < 490.0) {
        g = (wavelength - 440.0) / (490.0 - 440.0);
        b = 1.0;
    } else if (wavelength >= 490.0 && wavelength < 510.0) {
        g = 1.0;
        b = -(wavelength - 510.0) / (510.0 - 490.0);
    } else if (wavelength >= 510.0 && wavelength < 580.0) {
        r = (wavelength - 510.0) / (580.0 - 510.0);
        g = 1.0;
    } else if (wavelength >= 580.0 && wavelength < 645.0) {
        r = 1.0;
        g = -(wavelength - 645.0) / (645.0 - 580.0);
    } else if (wavelength >= 645.0 && wavelength < 780.0) {
        r = 1.0;
    }

    // Apply saturation/intensity factor (e.g., to fade out at the ends of the spectrum)
    if (wavelength > 700.0) s = 0.3 + 0.7 * (780.0 - wavelength) / (780.0 - 700.0);
    else if (wavelength < 420.0) s = 0.3 + 0.7 * (wavelength - 380.0) / (420.0 - 380.0);
    else s = 1.0;

    return vec3(r * s, g * s, b * s);
}


float sdRoundedCylinder( vec3 p, float ra, float rb, float h ){
  vec2 d = vec2( length(p.xz)-ra+rb, abs(p.y) - h + rb );
  return min(max(d.x,d.y),0.0) + length(max(d,0.0)) - rb;
}
float opSubtraction( float d1, float d2 ){
    return max(-d1,d2);
}

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

float fbm(vec3 p) {
  vec3 q = p + 0.5 * vec3(1.0, -0.2, -1.0);
  float g = noise(q);

  float f = 0.0;
  float scale = 0.5;
  float factor = 2.02;

  for (int i = 0; i < 6; i++) {
      f += scale * noise(q);
      q *= factor;
      factor += 0.21;
      scale *= 0.5;
  }

  return f;
}

vec3 bg(vec3 dir){
    vec2 uv_coord=vec2(
        0.5+(atan(dir.x,dir.z)/6.283185),
        0.5+(asin(dir.y/length(dir))/3.141592)
    );
    return texture(starfield, uv_coord).xyz;
}

float distanceFunction(vec3 p,float R) {
    // return length(p) - 1.0; // distance to sphere of radius 1
    float h=0.05;
    float ir=1*R;
    float or=4*R;
    return opSubtraction(sdRoundedCylinder(p, ir, h/2.0, h),sdRoundedCylinder(p, or, h/2.0, h));
}

float densityFunc(vec3 p,float R){
    float v = fbm(p*10.0);
    float val =(-distanceFunction(p,R)*v);
    // return 0.5*(pow(val,0.4)+1.0);
    return val*3.0;
}

vec3 revolve(vec3 p, float t, float d){
    // float omega = 0.04/d;
    float omega = 0.04;
    float angle = omega * t-(d);
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rotY = mat3(
        cosA, 0.0, sinA,
        0.0, 1.0, 0.0,
        -sinA, 0.0, cosA
    );
    return rotY * p;
}

vec3 rk4(vec3 p, float d, vec3 rd, float dt, float G, float M, float R) {
    //(dt*G*(p/pow(d,3.0))*M)
    //new acc=G*(p/pow(d,3.0))*M
    // vec3 a0 = -normalize(p) * (G * M) / (d * d);
    d=d-R;
    vec3 a0 = -p*(G/(d*d*d))*M;
    vec3 v1 = normalize(rd+(a0*dt*0.5));
    vec3 r1 = p+(rd*dt*0.5);
    float d1 = length(r1);

    // vec3 a1 = -normalize(r1) * (G * M) / (d1 * d1);
    vec3 a1 = -r1*(G/(d1*d1*d1))*M;
    vec3 v2 = normalize(rd+(a1*dt*0.5));
    vec3 r2 = p+(v1*dt*0.5);
    float d2 = length(r2);

    // vec3 a2 = -normalize(r2) * (G * M) / (d2 * d2);
    vec3 a2 = -r2*(G/(d2*d2*d2))*M;
    vec3 v3 = normalize(rd+(a2*dt));
    vec3 r3 = p+(v2*dt);
    float d3 = length(r3);

    // vec3 a4 = -normalize(r3) * (G * M) / (d3 * d3);
    vec3 a4 = -r3*(G/(d3*d3*d3))*M;
    vec3 v4 = normalize(rd+(a4*dt));

    vec3 acc = (a0 + 2.0*a1 + 2.0*a2 + a4)*dt / 6.0;
    return (rd + 2.0*v1 + 2.0*v2 + v4)*dt / 6.0;
}

const vec3 sunDirection=vec3(0.5773);


vec3 colorAt(vec3 p, float d, vec3 rd, float R, float G, float M){
    float density=densityFunc(revolve(p,time,d),R);
    // density=clamp(density*0.00002,0.1,1.0);
    // density=(0.5+density)*1.5;
    // return vec3(dot(p,sunDirection)); // hit SOLID SPHERE

    /*float diffuse = clamp((density - densityFunc(p + 0.3 * sunDirection,R)) / 0.3, 0.0, 1.0 );
    vec3 lin = vec3(0.7) * 1.1 + 0.8 * vec3(1.0) * diffuse;

    vec3 color = mix(vec3(0.98,0.84,0.39), vec3(0.0, 0.0, 0.0), density);
    // color.rgb *= density*lin*1.5/d;
    color.rgb *= density*lin*(1.0+(pow(d,3.0))/8.0);
    //------PROPER COLOR---------
    // vec3 color=accretionColor(d, dot(rd,normalize(vec3(-p.y,0.0,p.x))));
    //-----------------------------
    // res += pow(color * (1.0 -density),vec3(0.45));
    // return color * (1.0 -pow(density,0.75))*2.0;
    return color * (density)*2.0;*/

    // float lambda=(100.0/(d*d*d))*pow(1.0-(d/(R*3.0)),-0.25); //V2
    // float lambda=pow((-G*M/(d*d*d))*(1.0-(d/(R*3.0))),-0.25);// 3.01R-> 8.76 , 6R->3.53 //V3
    
    
    float lambda=pow((10000*G*M/(d*d*d))*(1.0-sqrt(R/d)),0.25);// 3.01R-> 8.76 , 6R->3.53
    float a = 3.8399;
    float b = 5.296;
    float normalizedVal=(((a-lambda)/(b-a))+1.0)+(dot(-rd,normalize(vec3(-p.z,0.0,p.x)))*0.5);
    vec3 colour = wavelengthToRGB((normalizedVal*20.0)+600.0);
    // return (colour*8.0/256.0)+vec3(density*0.5);
    return (colour*50.0/256.0*pow(density,0.4));
    
    
    // return vec3(density);//+(density*0.001);



    // return accretionColor(d, dot(normalize(vec3(-p.z,0.0,p.x)),rd))*density;
}

vec3 raymarch(vec3 ro, vec3 rd) {
    float G=0.3;
    float c=1.0;
    // float R=0.66; // Schwarzschild radius
    float M=1.0;
    float R=2.0*G*M/(c*c); // Schwarzschild radius

    vec3 res=vec3(0.0);

    float d = length(ro);
    vec3 original_rd=normalize(rd);
    vec3 p = ro;
    for(int i = 0; i < 800; i++) {
        p = ro;
        // ---- ACCRETION DISK PART ----
        float d_accretion = distanceFunction(p,R); // distance to sphere of radius 1
        if(d_accretion < -0.01) {
            res += colorAt(p,d,rd,R,G,M);
        }
        // -------------------------

        // ---- BLACK HOLE PART ----
        d=length(p);
        if(d<R) {
            return res; // hit black hole
        }
        else if(d>200.0){
            break; // too far
        }


        float dt=0.01+(pow(d,3.0))/3246.0;
        rd=normalize(rk4(p,d,rd,dt,G,M,R));
        // rd=normalize(rd-(G*p*(0.2/pow(d,3.0))*M));
        // ---- BLACK HOLE PART ----

        ro += rd * dt;
    }
    
    // return (res*(dot(-normalize(vec3(-p.z,p.y,p.x)),original_rd)*0.5+1.5)*1.5)+bg(rd);
    return (res)+bg(rd);
    
}


void main() {
    vec3 f = normalize(lookat);          // forward
    // vec3 f = normalize(lookat-position);          // forward
    vec3 r = normalize(cross(f, up));     // right
    vec3 u = cross(r, f);                    // corrected up

    mat3 viewRot = mat3(r, u, -f);

    vec3 dir = normalize(viewRot*(color*2.0-1.0));
    vec3 res = raymarch(position, dir);
    if(res==vec3(1.0,0.0,0.0)){
        out_color = vec4(bg(dir), 1.0);
        return;
    }
    out_color = vec4(res, 1.0);
    return;
}